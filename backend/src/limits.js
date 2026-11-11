// Rate limits. In-memory per instance, which is the honest scope for one container;
// behind a load balancer with several tasks the effective limit multiplies, which is
// still enough to stop password guessing and sync hammering.
//
// Keys on the client IP, so TRUST_PROXY must be set when there's a proxy in front
// (Caddy, an ALB, CloudFront) or every request looks like it came from the proxy.

import rateLimit from "express-rate-limit";

const json = (message) => ({ error: message });

/**
 * Per IP across sign-in, sign-up and reset. Deliberately loose: a college hostel or
 * an office can put hundreds of people behind one address. The tight limit is the
 * per-account one below.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Too many attempts — try again in a few minutes"),
});

/** Per account being signed into: ten guesses per 15 minutes makes guessing pointless. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => `login:${String(req.body?.emailOrUsername ?? "").trim().toLowerCase()}`,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Too many sign-in attempts for this account — try again in 15 minutes"),
});

/** Anything that sends an email: a mailbox shouldn't be floodable through us. */
export const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Too many emails requested — try again later"),
});

/** Sync fans out to third-party APIs, so per user rather than per IP. */
export const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Syncing too often — give it a minute"),
});

/** Chat and other writes: generous for people, tight for scripts. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.userId ?? req.ip,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Slow down a little"),
});
