import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
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
app.use("/api", tasksRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Express 5 forwards rejected async handlers here, so nothing leaks a stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(port, () => console.log(`StreakArena API on http://localhost:${port}`));
