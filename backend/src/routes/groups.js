import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
import { getPlatform, isPlatformId } from "../platforms.js";
import { currentStreak, fromDbDate, longestStreak, todayInTz } from "../streak.js";

export const groupsRouter = Router();

groupsRouter.use(requireAuth, loadUser);

// No I, O, 0 or 1 — invite codes get read aloud and typed by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function makeCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Retries on the astronomically unlikely collision rather than assuming. */
async function uniqueCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const taken = await prisma.group.findUnique({ where: { inviteCode: code } });
    if (!taken) return code;
  }
  throw new Error("Couldn't allocate an invite code");
}

/** Membership is the only permission that matters here, so it's checked in one place. */
async function requireMembership(groupId, userId) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  return membership?.group ?? null;
}

function platformSummary(id) {
  const platform = id && getPlatform(id);
  if (!platform) return null;
  return { id: platform.id, label: platform.label, emoji: platform.emoji };
}

groupsRouter.get("/groups", async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.id },
    orderBy: { joinedAt: "asc" },
    include: {
      group: {
        include: { _count: { select: { members: true, tasks: true } } },
      },
    },
  });

  res.json({
    groups: memberships.map(({ group }) => ({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      isOwner: group.createdById === req.user.id,
      memberCount: group._count.members,
      challengeCount: group._count.tasks,
    })),
  });
});

groupsRouter.post("/groups", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Give the group a name" });
  if (name.length > 60) return res.status(400).json({ error: "Keep the name under 60 characters" });

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode: await uniqueCode(),
      createdById: req.user.id,
      members: { create: { userId: req.user.id } },
    },
  });
  res.status(201).json({ group: { id: group.id, name: group.name, inviteCode: group.inviteCode } });
});

/**
 * Joining backfills a personal task for every challenge already in the group, so a
 * late joiner starts racing immediately instead of on the next one created.
 */
groupsRouter.post("/groups/join", async (req, res) => {
  const code = String(req.body?.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Enter an invite code" });

  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { tasks: true },
  });
  if (!group) return res.status(404).json({ error: "No group with that code" });

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: req.user.id } },
  });
  if (existing) return res.json({ group: { id: group.id, name: group.name }, alreadyMember: true });

  await prisma.$transaction([
    prisma.groupMember.create({ data: { groupId: group.id, userId: req.user.id } }),
    prisma.task.createMany({
      data: group.tasks.map((task) => ({
        userId: req.user.id,
        title: task.title,
        platform: task.platform,
        groupTaskId: task.id,
      })),
    }),
  ]);

  res.status(201).json({ group: { id: group.id, name: group.name } });
});

/**
 * The group view: who's in, what they're racing on, and how everyone is doing.
 *
 * Each member's day boundary is their own, so a streak is measured against today in
 * *their* timezone — otherwise someone in Auckland would look behind someone in
 * California every morning.
 */
groupsRouter.get("/groups/:id", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const [members, challenges] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId: group.id },
      orderBy: { joinedAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            timezone: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.groupTask.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: "asc" },
      include: {
        tasks: {
          select: { id: true, userId: true, completions: { select: { localDate: true } } },
        },
      },
    }),
  ]);

  const standings = members.map((member) => {
    const { user } = member;
    const today = todayInTz(user.timezone);

    const perChallenge = challenges.map((challenge) => {
      const task = challenge.tasks.find((t) => t.userId === user.id);
      const dates = task?.completions.map((c) => fromDbDate(c.localDate)) ?? [];
      return {
        challengeId: challenge.id,
        joined: Boolean(task),
        currentStreak: currentStreak(dates, today),
        longestStreak: longestStreak(dates),
        totalDays: dates.length,
        doneToday: dates.includes(today),
      };
    });

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isYou: user.id === req.user.id,
      // The score is the sum of live streaks: today's form, not lifetime totals.
      score: perChallenge.reduce((sum, entry) => sum + entry.currentStreak, 0),
      doneToday: perChallenge.filter((entry) => entry.doneToday).length,
      challenges: perChallenge,
    };
  });

  standings.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));

  res.json({
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      isOwner: group.createdById === req.user.id,
    },
    challenges: challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      platform: platformSummary(challenge.platform),
    })),
    standings,
  });
});

/** Creating a challenge gives every current member their own copy of it. */
groupsRouter.post("/groups/:id/tasks", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "Give the challenge a name" });
  if (title.length > 80) return res.status(400).json({ error: "Keep the name under 80 characters" });

  const platform = req.body?.platform ? String(req.body.platform) : null;
  if (platform && !isPlatformId(platform)) return res.status(400).json({ error: "Unknown platform" });

  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    select: { userId: true },
  });

  const challenge = await prisma.groupTask.create({
    data: {
      groupId: group.id,
      title,
      platform,
      tasks: {
        create: members.map((member) => ({ userId: member.userId, title, platform })),
      },
    },
  });

  res.status(201).json({ challenge: { id: challenge.id, title: challenge.title } });
});

/** Removing a challenge detaches everyone's copy instead of deleting their history. */
groupsRouter.delete("/groups/:id/tasks/:taskId", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const { count } = await prisma.groupTask.deleteMany({
    where: { id: req.params.taskId, groupId: group.id },
  });
  if (!count) return res.status(404).json({ error: "Challenge not found" });
  res.json({ ok: true });
});

groupsRouter.post("/groups/:id/leave", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const challenges = await prisma.groupTask.findMany({
    where: { groupId: group.id },
    select: { id: true },
  });

  await prisma.$transaction([
    // Your copies stay yours, just no longer part of the group.
    prisma.task.updateMany({
      where: { userId: req.user.id, groupTaskId: { in: challenges.map((c) => c.id) } },
      data: { groupTaskId: null },
    }),
    prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: req.user.id } }),
  ]);

  res.json({ ok: true });
});

groupsRouter.delete("/groups/:id", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.createdById !== req.user.id) {
    return res.status(403).json({ error: "Only the group's creator can delete it" });
  }

  // Members and challenges cascade; everyone's tasks detach and survive.
  await prisma.group.delete({ where: { id: group.id } });
  res.json({ ok: true });
});


const MESSAGE_LIMIT = 200;
const MESSAGE_MAX = 1000;

function publicMessage(message) {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    author: {
      userId: message.user.id,
      username: message.user.username,
      displayName: message.user.displayName ?? null,
      avatarUrl: message.user.avatarUrl ?? null,
    },
  };
}

const MESSAGE_AUTHOR = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

/**
 * The group's chat, oldest first.
 *
 * `after` makes this pollable: the client passes the id of the last message it has
 * and gets only what arrived since, so an open chat isn't refetching the whole
 * history every few seconds.
 */
groupsRouter.get("/groups/:id/messages", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  let after = null;
  if (req.query.after) {
    const cursor = await prisma.groupMessage.findFirst({
      where: { id: String(req.query.after), groupId: group.id },
      select: { createdAt: true },
    });
    // An unknown cursor falls back to the full page rather than erroring — the
    // message it named may simply have been in a group the user just switched from.
    after = cursor?.createdAt ?? null;
  }

  const messages = await prisma.groupMessage.findMany({
    where: { groupId: group.id, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: MESSAGE_LIMIT,
    include: MESSAGE_AUTHOR,
  });

  // Without a cursor the newest are taken and then flipped, so the client always
  // receives oldest-first regardless of which branch ran.
  const ordered = after ? messages : messages.reverse();
  res.json({ messages: ordered.map(publicMessage) });
});

groupsRouter.post("/groups/:id/messages", async (req, res) => {
  const group = await requireMembership(req.params.id, req.user.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const body = String(req.body?.body ?? "").trim();
  if (!body) return res.status(400).json({ error: "Write something first" });
  if (body.length > MESSAGE_MAX) {
    return res.status(400).json({ error: `Keep it under ${MESSAGE_MAX} characters` });
  }

  const message = await prisma.groupMessage.create({
    data: { groupId: group.id, userId: req.user.id, body },
    include: MESSAGE_AUTHOR,
  });
  res.status(201).json({ message: publicMessage(message) });
});
