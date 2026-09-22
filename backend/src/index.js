import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { globalRouter } from "./routes/global.js";
import { groupsRouter } from "./routes/groups.js";
import { profilesRouter } from "./routes/profiles.js";
import { tasksRouter } from "./routes/tasks.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api", profilesRouter);
app.use("/api", groupsRouter);
app.use("/api", globalRouter);
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
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

// 0.0.0.0 so the port is reachable from outside the container.
app.listen(port, "0.0.0.0", () => console.log(`StreakArena listening on port ${port}`));
