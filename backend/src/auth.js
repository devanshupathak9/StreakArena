import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

const COOKIE_NAME = "sa_token";

// A `secure` cookie is dropped by the browser over plain HTTP, which would look
// like "login does nothing". Production defaults to secure; a deployment that is
// still on http:// sets COOKIE_SECURE=false explicitly.
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === "production"
    : process.env.COOKIE_SECURE === "true";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const OAUTH_COOKIE_NAME = "sa_oauth";
const OAUTH_MAX_AGE_MS = 10 * 60 * 1000;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set — copy backend/.env.example to backend/.env");
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * `v` is the user's tokenVersion at sign-in. loadUser rejects a cookie whose version
 * is behind, so bumping the column signs out every session at once. Cookies issued
 * before versions existed carry none and read as 0, the column's default — so this
 * shipped without logging anyone out.
 */
export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id, v: user.tokenVersion ?? 0 }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: MAX_AGE_MS,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/**
 * The short-lived cookie that makes the Google round trip tamper-proof: the nonce
 * travels to Google in `state` and comes back in the URL, and only a request that
 * also carries this cookie can have started the flow.
 *
 * `sameSite: "lax"` is load-bearing — the callback arrives as a top-level navigation
 * from accounts.google.com, and "strict" would withhold the cookie and break it.
 */
export function setOAuthState(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10m" });
  res.cookie(OAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: OAUTH_MAX_AGE_MS,
  });
}

/** Reads the state cookie and spends it, so a callback URL can't be replayed. */
export function takeOAuthState(req, res) {
  const token = req.cookies?.[OAUTH_COOKIE_NAME];
  res.clearCookie(OAUTH_COOKIE_NAME);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Populates req.userId, or 401s. */
export function requireAuth(req, res, next) {
  // Several routers mount this on /api, so a request can pass through it more than
  // once on its way to the handler. Verify once.
  if (req.userId) return next();
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not signed in" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.tokenVersion = payload.v ?? 0;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ error: "Session expired" });
  }
}

/** Loads the signed-in user after requireAuth; 401s if the account is gone. */
export async function loadUser(req, res, next) {
  // Same reason as above: without this, one dashboard request read the user row
  // four times.
  if (req.user) return next();
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Account no longer exists" });
  }
  if ((user.tokenVersion ?? 0) !== req.tokenVersion) {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Session expired — sign in again" });
  }
  req.user = user;
  next();
}

/** Only ever called with the signed-in user's own row — never another member's. */
export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    timezone: user.timezone,
    createdAt: user.createdAt,
    // How this account can sign in. The UI needs both: it must not offer to
    // disconnect Google from an account that would then have no way back in.
    hasPassword: Boolean(user.passwordHash),
    emailVerified: Boolean(user.emailVerifiedAt),
    googleLinked: Boolean(user.googleId),
    googleEmail: user.googleEmail ?? null,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    location: user.location ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}
