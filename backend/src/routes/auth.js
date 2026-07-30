import { Router } from "express";
import { prisma } from "../db.js";
import {
  clearAuthCookie,
  hashPassword,
  loadUser,
  publicUser,
  requireAuth,
  setAuthCookie,
  verifyPassword,
} from "../auth.js";
import { isValidTimezone } from "../streak.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

authRouter.post("/register", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");
  const timezone = String(req.body?.timezone ?? "UTC");

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "Username must be 3-20 letters, numbers or underscores" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!isValidTimezone(timezone)) return res.status(400).json({ error: "Unknown timezone" });

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return res.status(409).json({ error: `That ${field} is already taken` });
  }

  const user = await prisma.user.create({
    data: { email, username, timezone, passwordHash: await hashPassword(password) },
  });
  setAuthCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const identifier = String(req.body?.emailOrUsername ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!identifier || !password) {
    return res.status(400).json({ error: "Enter your email/username and password" });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
  });
  // Same message either way, so this can't be used to probe which accounts exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email/username or password" });
  }

  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, loadUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.patch("/me", requireAuth, loadUser, async (req, res) => {
  const data = {};

  if (req.body?.username !== undefined) {
    const username = String(req.body.username).trim();
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3-20 letters, numbers or underscores" });
    }
    if (username !== req.user.username) {
      const taken = await prisma.user.findUnique({ where: { username } });
      if (taken) return res.status(409).json({ error: "That username is already taken" });
      data.username = username;
    }
  }

  if (req.body?.timezone !== undefined) {
    const timezone = String(req.body.timezone);
    if (!isValidTimezone(timezone)) return res.status(400).json({ error: "Unknown timezone" });
    data.timezone = timezone;
  }

  const user = Object.keys(data).length
    ? await prisma.user.update({ where: { id: req.user.id }, data })
    : req.user;
  res.json({ user: publicUser(user) });
});
