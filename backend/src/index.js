import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { authRouter, avatarRouter } from "./routes/auth.js";
import { globalRouter } from "./routes/global.js";
import { groupsRouter } from "./routes/groups.js";
import { profilesRouter } from "./routes/profiles.js";
import { tasksRouter } from "./routes/tasks.js";
import { startScheduler } from "./scheduler.js";
import { startReminders } from "./reminders.js";
import { notificationsRouter } from "./routes/notifications.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

// Behind Caddy/an ALB/CloudFront the client IP arrives in X-Forwarded-For. Without
// this every request looks like the proxy's, and one IP's rate limit is everyone's.
// A hop count ("1") or "loopback"; unset means no proxy is trusted.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(value) ? Number(value) : value);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // React sets inline style attributes; Inter comes from Google Fonts.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        // Avatars are any https URL a user pastes, plus Google's profile pictures.
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://accounts.google.com"],
        // Plain-HTTP test deployments would otherwise have every asset upgraded to
        // an https that isn't there.
        upgradeInsecureRequests: process.env.COOKIE_SECURE === "false" ? null : [],
      },
    },
    // HSTS on an http:// deployment is ignored by browsers but misleading; keep it
    // for real HTTPS.
    strictTransportSecurity: process.env.COOKIE_SECURE !== "false",
    // Avatars and attachments are fetched by <img> on the same origin; nothing here
    // needs cross-origin isolation.
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api", avatarRouter);
app.use("/api", profilesRouter);
app.use("/api", groupsRouter);
app.use("/api", globalRouter);
app.use("/api", notificationsRouter);
app.use("/api", tasksRouter);

// In a container the built React bundle sits next to the API, so one process and
// one port serve both — same origin, so the auth cookie needs no CORS dance.
const clientDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/dist",
);

if (fs.existsSync(path.join(clientDir, "index.html"))) {
  app.use(express.static(clientDir));
  // Anything that isn't an API call is a client-side route: hand back index.html
  // so a refresh on /profile doesn't 404.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Express 5 forwards rejected async handlers here, so nothing leaks a stack trace.
app.use((err, req, res, next) => {
  // A malformed or oversized body is the client's mistake, not a server fault.
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request too large" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

// 0.0.0.0 so the port is reachable from outside the container.
app.listen(port, "0.0.0.0", () => {
  console.log(`StreakArena listening on port ${port}`);
  startScheduler();
  startReminders().catch((error) => console.error("reminders failed to start:", error.message));
});
