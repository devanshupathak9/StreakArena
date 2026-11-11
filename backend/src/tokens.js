// Single-use tokens for links we email: password reset and email verification.
// The raw token only ever exists in the email; the database holds its SHA-256, so
// reading the AuthToken table doesn't let anyone reset a password.

import crypto from "node:crypto";
import { prisma } from "./db.js";

export const TOKEN_TTL_MS = {
  reset: 60 * 60 * 1000, // an hour: a reset link is a live credential
  verify: 48 * 60 * 60 * 1000,
};

const hash = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

/** A new token for this purpose. Older unused ones are spent so only the latest link works. */
export async function issueToken(userId, purpose) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
      },
    }),
  ]);
  return raw;
}

/**
 * Spends a token and returns its user id, or null if it's unknown, expired, used, or
 * for another purpose. The spend is one conditional update, so two clicks on the
 * same link can't both succeed.
 */
export async function consumeToken(raw, purpose) {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 100) return null;
  const tokenHash = hash(raw);
  const { count } = await prisma.authToken.updateMany({
    where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (!count) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return row?.userId ?? null;
}
