# StreakArena

A habit and task streak tracker — set daily tasks, build streaks, and visualize your progress over time.

This is **v1**: register, log in, create daily tasks, mark them done, and watch your streak tiles fill
up. Groups, leaderboards and daily points come later — the data model already leaves room for them.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express 5 + Prisma (plain JavaScript, ESM, no build step) |
| Database | PostgreSQL 17 via docker-compose |
| Auth | JWT in an httpOnly cookie |

## Getting started

```bash
# 1. Database
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # then put a long random string in JWT_SECRET
npm install
npx prisma migrate dev        # creates the tables
npm run dev                   # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Open the frontend URL and sign up. Vite proxies `/api` to the backend, so the browser stays on a
single origin and the auth cookie works without CORS setup in development.

## How streaks work

Every user has an IANA timezone (picked up from the browser at signup, editable in Profile). When you
mark a task done, the server works out what calendar date it is *in your timezone* and stores that
bare date — so day boundaries follow you, and every streak query stays plain date arithmetic.

- A day counts once per task: marking it twice is a no-op, not an error.
- Your current streak counts back from today. If today isn't marked yet it counts back from
  yesterday instead, so a streak doesn't look broken at 9am before you've done the task.
- Past days are editable for 90 days back by clicking a tile; future days are rejected.

## Project layout

```
backend/
  prisma/schema.prisma    User, Task, TaskCompletion
  src/
    index.js              express app + middleware
    auth.js               password hashing, cookie/JWT, requireAuth
    streak.js             timezone + streak math
    routes/auth.js        register, login, logout, profile
    routes/tasks.js       dashboard, task CRUD, complete/uncomplete
frontend/src/
  context/AuthContext.tsx session state, restored from the cookie on load
  lib/api.ts              typed fetch wrapper
  components/             Heatmap, TaskRow, StreakTiles, TaskForm, Nav
  pages/                  Login, Register, Dashboard, Profile
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `email, username, password, timezone` |
| POST | `/api/auth/login` | `emailOrUsername, password` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| PATCH | `/api/auth/me` | `username`, `timezone` |
| GET | `/api/dashboard?days=30` | tasks + streaks + tiles + 90-day heatmap, in one call |
| POST | `/api/tasks` | `title` |
| DELETE | `/api/tasks/:id` | also deletes its history |
| POST | `/api/tasks/:id/complete` | optional `date`, defaults to today |
| DELETE | `/api/tasks/:id/complete/:date` | undo |

Everything except register/login requires the cookie and is scoped to the signed-in user.

## Useful commands

```bash
npx prisma studio            # browse the database (backend/)
npm run typecheck            # frontend type check
docker compose down -v       # wipe the database volume and start over
```
