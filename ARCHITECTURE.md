# Architecture

One container, one port, one origin.

```
browser ──► :8080 ─┬─► /api/*   Express routers
                   └─► /*       the built React bundle (SPA fallback)
                           │
                           └──► Postgres (:5433, localhost only)
                           └──► github · leetcode · codeforces · chess.com · duolingo
```

Express serves the React build itself, so there is no CORS, no proxy and no second origin — which
is what lets the auth cookie be a plain `httpOnly` cookie with no special handling.

## Data model

```
User ──┬── Task ──── TaskCompletion      (localDate, source: manual | synced)
       │     └────── groupTaskId?        → GroupTask
       ├── PlatformAccount               (platform, handle, lastSyncedAt, lastSyncError)
       ├── GroupMember ─── Group ─── GroupTask
       └── Group (created)
```

Two decisions carry most of the weight:

**`TaskCompletion.localDate` is a bare date in the user's timezone.** Day boundaries follow the
person, and every streak query downstream becomes plain date arithmetic instead of timezone-aware
SQL. The cost is that leaderboards can't be SQL aggregates — each member's "today" differs — so
ranking folds in JS.

**A group challenge is a template; each member gets their own `Task`.** `GroupTask` holds the
shared definition, `Task.groupTaskId` points back. Streaks, tiles and sync therefore work inside a
group with no special cases, and detaching (`SetNull`) leaves a member's history intact when they
leave.

## Backend (`backend/src`, plain JS + ESM)

| File | Responsibility |
| --- | --- |
| `index.js` | app wiring, static bundle + SPA fallback, error handler |
| `auth.js` | password hashing, JWT cookie, `requireAuth` / `loadUser`, `publicUser` |
| `streak.js` | timezone → calendar date, current/longest streak, date helpers |
| `platforms.js` | the catalog: label, handle pattern, profile-URL template |
| `sync.js` | one adapter per platform: *which days was this handle active?* |
| `routes/` | `auth`, `profiles`, `tasks` (incl. sync), `groups`, `global` |

Authorisation is a `where` clause, not a check: every query is scoped by `userId`, so another
user's id matches nothing rather than being caught by an `if`.

`sync.js` adapters all return `Set<YYYY-MM-DD>` and throw user-facing messages. The route catches
per platform, so one broken endpoint reports itself and the others still run. Only Codeforces and
Chess.com are documented, supported APIs; GitHub is official but wants a token for the good
endpoint; LeetCode and Duolingo are undocumented and expected to break.

## Frontend (`frontend/src`, React + TS + Vite)

```
App.tsx            signed out → split auth screen; signed in → sidebar + content
context/Auth       session restored from the cookie on mount
lib/api.ts         one typed fetch wrapper; every call goes through it
components/        Sidebar, Avatar, TaskRow, StreakTiles, Heatmap, LinkedProfiles, Toasts, Footer
pages/             Dashboard, Groups, GroupDetail, Global, Profile, About, Login, Register
```

`GET /api/dashboard` returns tasks, streaks, tiles, linked profiles and the 90-day heatmap in a
single request, so the dashboard renders from one round trip. Toggling a tile updates local state
immediately and then refetches, because the streak is the server's call.

`styles.css` is a small design system — colour, type, space and elevation scales — with dark as
the default and light as a token swap. No CSS framework.

## Request flow: a sync

```
POST /api/sync
  └─ tasks with a platform, grouped by platform          (one fetch per platform, not per task)
      └─ sync.js adapter → Set of active days
          └─ createMany the days not already present, source: "synced"
              └─ PlatformAccount.lastSyncedAt / lastSyncError updated either way
  └─ per-platform results → one toast each
```

Additive by design: manual days are never touched, and a day the platform stops reporting is left
alone.
