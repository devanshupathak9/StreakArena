// Background sync. Pressing Sync is optional: every linked platform is checked on a
// timer, so a streak that was really kept can't break because nobody clicked a button.
//
// Additive like every other sync, so a run that overlaps a manual one, or a second
// instance, can't do harm — the lease just stops the work being done twice.

import crypto from "node:crypto";
import { prisma } from "./db.js";
import { runSync } from "./routes/tasks.js";

const INTERVAL_MINUTES = Number(process.env.SYNC_INTERVAL_MINUTES ?? 180);
const LEASE_NAME = "scheduled-sync";
const HOLDER = crypto.randomUUID();

// A user synced within this window (by hand or by the last run) is skipped, so a run
// spends its upstream budget on whoever is actually stale.
const FRESH_FOR_MS = Math.max(INTERVAL_MINUTES - 5, 5) * 60 * 1000;

// Spacing between users. GitHub without a token allows 60 requests an hour for the
// whole server; going gently matters more than finishing fast.
const PAUSE_MS = Number(process.env.SYNC_PAUSE_MS ?? 1500);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True if this instance now holds the lease. Expired leases are taken over. */
async function acquireLease(ms) {
  const until = new Date(Date.now() + ms);
  const rows = await prisma.$queryRaw`
    INSERT INTO "JobLease" ("name", "holder", "until")
    VALUES (${LEASE_NAME}, ${HOLDER}, ${until})
    ON CONFLICT ("name") DO UPDATE
      SET "holder" = EXCLUDED."holder", "until" = EXCLUDED."until"
      WHERE "JobLease"."until" < NOW() OR "JobLease"."holder" = ${HOLDER}
    RETURNING "holder"`;
  return rows.length > 0 && rows[0].holder === HOLDER;
}

async function releaseLease() {
  await prisma.jobLease.deleteMany({ where: { name: LEASE_NAME, holder: HOLDER } });
}

export async function syncEveryone() {
  // The lease outlives a slow run rather than expiring mid-way and letting a second
  // instance start the same users over.
  if (!(await acquireLease(INTERVAL_MINUTES * 60 * 1000))) return { skipped: true };

  const started = Date.now();
  let users = 0;
  let added = 0;
  let failures = 0;

  try {
    const candidates = await prisma.user.findMany({
      where: {
        tasks: { some: { platform: { not: null } } },
        platformAccounts: { some: {} },
      },
      include: { platformAccounts: { select: { lastSyncedAt: true } } },
    });

    for (const user of candidates) {
      const newest = Math.max(0, ...user.platformAccounts.map((a) => a.lastSyncedAt?.getTime() ?? 0));
      if (Date.now() - newest < FRESH_FOR_MS) continue;

      try {
        const results = await runSync(user);
        users++;
        for (const result of results) {
          added += result.added;
          if (!result.ok) failures++;
        }
      } catch (error) {
        // One user's bad data must not stop everyone after them.
        failures++;
        console.error(`scheduled sync failed for ${user.id}:`, error.message);
      }
      await sleep(PAUSE_MS);
    }
  } finally {
    await releaseLease();
  }

  const summary = { users, added, failures, ms: Date.now() - started };
  console.log("scheduled sync", JSON.stringify(summary));
  return summary;
}

/** Starts the timer. SYNC_INTERVAL_MINUTES=0 turns it off. */
export function startScheduler() {
  if (!Number.isFinite(INTERVAL_MINUTES) || INTERVAL_MINUTES <= 0) {
    console.log("scheduled sync is off (SYNC_INTERVAL_MINUTES=0)");
    return;
  }

  const tick = () =>
    syncEveryone().catch((error) => console.error("scheduled sync crashed:", error.message));

  // First run shortly after boot rather than immediately, so a crash-looping
  // container doesn't hammer every platform API on each restart.
  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, INTERVAL_MINUTES * 60 * 1000).unref();
  console.log(`scheduled sync every ${INTERVAL_MINUTES} min`);
}
