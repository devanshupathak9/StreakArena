# StreakArena

A habit and task streak tracker — set daily tasks, build streaks, and visualize your progress over time.

This is **v1**: register, log in, link your handles on the sites you practise on, create daily tasks,
mark them done, and watch your streak tiles fill up. Groups, leaderboards, daily points and automatic
verification come later — the data model already leaves room for them.

## Deploying

`docker compose up -d --build` builds the React bundle and serves it from the API, so the whole
app is one container on one port — same origin, no CORS, no proxy. It publishes on **:8080**, and
Postgres binds to localhost only.

Over plain HTTP set `COOKIE_SECURE=false` (the compose file already does), or browsers silently
drop the auth cookie and login looks like it does nothing. Put a real domain and HTTPS in front
before this is more than a test, and change `JWT_SECRET`.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express 5 + Prisma (plain JavaScript, ESM, no build step) |
| Database | PostgreSQL 17 via docker-compose |
| Auth | JWT in an httpOnly cookie |

Colour carries meaning rather than decoration: **orange is only ever a live streak** (the flame and
today's outline), interactive elements are indigo, and the tiles use a green contribution-graph
scale. `styles.css` is a small design system — colour, type, space and elevation scales — so there
is no CSS framework to fight.

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

## Linked profiles and sync

A task can be tagged with a platform. Link your handle once in **Profile → Linked profiles** and
two things happen: the task grows a badge that opens your profile there, and **Sync** reads your
real activity back, so a streak is evidence rather than self-report.

| Platform | How a day is counted | Source |
| --- | --- | --- |
| GitHub | Any day with contributions | Official GraphQL calendar with a token; public events without one |
| LeetCode | Any day you submitted | Undocumented GraphQL endpoint |
| Codeforces | Any day you submitted, solved or not | Official public API |
| Chess.com | Any day you finished a game | Official public API |
| Duolingo | The days in your current streak | Undocumented endpoint |

Sync is **additive**. A day you ticked yourself is never touched, and a day a platform stops
reporting is left alone rather than revoked — sync can add to your record but not quietly rewrite
it. Each platform is fetched once per sync, not once per task, and one platform failing doesn't
stop the others: the failure is reported next to that handle and remembered in `lastSyncError`.

Only Codeforces and Chess.com publish supported APIs for this. LeetCode's and Duolingo's are
undocumented and can change without notice, which is why every adapter is wrapped.

### GitHub token (optional but worth it)

Without a token, GitHub sync falls back to the public events API: ~90 days of history and 60
requests an hour **shared by everyone on the server**. With one it reads the real contribution
calendar — a full year, exact per-day counts, 5000 requests an hour.

Create one at [github.com/settings/tokens](https://github.com/settings/tokens) with **no scopes**
(public data needs none), then add it to `.env` in the project root and restart:

```bash
echo 'GITHUB_TOKEN=ghp_yourtokenhere' >> .env
docker compose up -d
```

## Profile

Name, bio, location and an avatar, all optional — an account works with none of them set.
The avatar is an image URL rather than an upload, so there's no file storage to run; leave it
empty and you get generated initials on a colour derived from your username, which stays the same
everywhere you appear. If you're on GitHub, `https://github.com/yourname.png` is already a picture
of you.

The URL is validated for scheme before it's stored, because it ends up in an `<img src>` that
everyone signed in can see — `javascript:` and `data:` are rejected. A URL that later breaks falls
back to initials rather than showing a broken image.

## Global dashboard

Everyone on this server, ranked by their longest running streak, with totals across the whole
site. Reachable from the footer, or at `/global`.

Ranking reads every user's completions and folds them in JS rather than aggregating in SQL,
because each streak is measured against today in that user's own timezone. That's fine at this
size; when it stops being fine the fix is a nightly snapshot table, not a cleverer query — the
numbers only change once a day.

Your username, display name and avatar are visible to anyone signed in. Your email never is.

## Groups

Create a group, share its six-character invite code, and everyone races the same challenges.

A group **challenge** is a shared definition — a title plus an optional platform. Each member
tracks it through their own ordinary `Task`, which is why streaks, tiles and platform sync keep
working inside a group with no special cases: the group only decides what everyone is racing on.
Joining backfills a personal task for every challenge already there, so a late joiner starts
immediately rather than on the next one created.

Chat takes **attachments** — images, PDFs and text files up to 5 MB. The bytes go to a mounted
volume rather than into Postgres, the stored filename is a random UUID so a client-supplied name
can't decide where anything lands, and every download goes through a route that re-checks group
membership and forces `Content-Disposition: attachment`. Nothing a member uploads can execute in
another member's origin.

Each group has a **chat**, polled on a cursor so an idle window costs one empty array rather
than the whole history. Messages belong to the group rather than to a membership, so someone
leaving doesn't blank out half a conversation for everyone still reading it.

The leaderboard ranks members by their **combined live streaks** — today's form, not lifetime
totals — and each member's streak is measured against today in *their own* timezone, so nobody
looks behind just because they're east of everyone else.

Nothing in a group can delete your history. Leaving a group, removing a challenge, or the owner
deleting the group all just detach your task (`groupTaskId` goes null) and leave it as a personal
task with its streak intact.

## How streaks work## Profile

Name, bio, location and an avatar, all optional — an account works with none of them set.
The avatar is an image URL rather than an upload, so there's no file storage to run; leave it
empty and you get generated initials on a colour derived from your username, which stays the same
everywhere you appear. If you're on GitHub, `https://github.com/yourname.png` is already a picture
of you.

The URL is validated for scheme before it's stored, because it ends up in an `<img src>` that
everyone signed in can see — `javascript:` and `data:` are rejected. A URL that later breaks falls
back to initials rather than showing a broken image.

## Global dashboard

Everyone on this server, ranked by their longest running streak, with totals across the whole
site. Reachable from the footer, or at `/global`.

Ranking reads every user's completions and folds them in JS rather than aggregating in SQL,
because each streak is measured against today in that user's own timezone. That's fine at this
size; when it stops being fine the fix is a nightly snapshot table, not a cleverer query — the
numbers only change once a day.

Your username, display name and avatar are visible to anyone signed in. Your email never is.

## Groups

Create a group, share its six-character invite code, and everyone races the same challenges.

A group **challenge** is a shared definition — a title plus an optional platform. Each member
tracks it through their own ordinary `Task`, which is why streaks, tiles and platform sync keep
working inside a group with no special cases: the group only decides what everyone is racing on.
Joining backfills a personal task for every challenge already there, so a late joiner starts
immediately rather than on the next one created.

Chat takes **attachments** — images, PDFs and text files up to 5 MB. The bytes go to a mounted
volume rather than into Postgres, the stored filename is a random UUID so a client-supplied name
can't decide where anything lands, and every download goes through a route that re-checks group
membership and forces `Content-Disposition: attachment`. Nothing a member uploads can execute in
another member's origin.

Each group has a **chat**, polled on a cursor so an idle window costs one empty array rather
than the whole history. Messages belong to the group rather than to a membership, so someone
leaving doesn't blank out half a conversation for everyone still reading it.

The leaderboard ranks members by their **combined live streaks** — today's form, not lifetime
totals — and each member's streak is measured against today in *their own* timezone, so nobody
looks behind just because they're east of everyone else.

Nothing in a group can delete your history. Leaving a group, removing a challenge, or the owner
deleting the group all just detach your task (`groupTaskId` goes null) and leave it as a personal
task with its streak intact.

## How streaks work

Every user has an IANA timezone (picked up from the browser at signup, editable in Profile). When you
mark a task done, the server works out what calendar date it is *in your timezone* and stores that
bare date — so day boundaries follow you, and every streak query stays plain date arithmetic.

- A day counts once per task: marking it twice is a no-op, not an error.
- **Platform-backed tasks have no manual control** — sync is what proves them, so their tiles are
  read-only. A task with no platform has nothing to ask, so ticking it by hand is the only way and
  the button stays.
- Your current streak counts back from today. If today isn't marked yet it counts back from
  yesterday instead, so a streak doesn't look broken at 9am before you've done the task.
- Past days are editable for 90 days back by clicking a tile; future days are rejected.
- The 90-day grid shades by how much you did that day — more completions, darker square — and a
  day where everything was done is always the darkest step, so a perfect day looks perfect
  whether you keep one task or six.
- Sync uses that same 90-day window, so it can only fill days you could have ticked yourself.

## Project layout

```
backend/
  prisma/schema.prisma    User, PlatformAccount, Task, TaskCompletion,
                          Group, GroupMember, GroupTask
  src/
    index.js              express app + middleware
    auth.js               password hashing, cookie/JWT, requireAuth
    streak.js             timezone + streak math
    platforms.js          the platform catalog: handles, patterns, profile URLs
    sync.js               one adapter per platform: which days was this handle active?
    routes/auth.js        register, login, logout, profile
    routes/profiles.js    the platform catalog + linking handles
    routes/groups.js      groups, challenges, membership, leaderboard
    routes/global.js      the site-wide leaderboard
    routes/tasks.js       dashboard, task CRUD, complete/uncomplete
frontend/src/
  context/AuthContext.tsx session state, restored from the cookie on load
  lib/api.ts              typed fetch wrapper
  components/             Heatmap, TaskRow, StreakTiles, TaskForm, LinkedProfiles,
                          Avatar, Toasts, Nav, Footer
  pages/                  Login, Register, Dashboard, Groups, GroupDetail, Global, Profile
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `email, username, password, timezone` |
| POST | `/api/auth/login` | `emailOrUsername, password` |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| PATCH | `/api/auth/me` | `username`, `timezone`, `displayName`, `bio`, `location`, `avatarUrl` |
| GET | `/api/global` | site-wide leaderboard and totals |
| GET | `/api/platforms` | the platforms you can link a handle on |
| GET | `/api/profiles` | your linked handles |
| PUT | `/api/profiles/:platform` | `handle` — link or re-link; accepts a pasted profile URL |
| DELETE | `/api/profiles/:platform` | unlink |
| GET | `/api/dashboard?days=30` | tasks + streaks + tiles + linked profiles + 90-day heatmap, in one call |
| POST | `/api/tasks` | `title`, optional `description` and `platform` |
| PATCH | `/api/tasks/:id` | `title`, `description` |
| DELETE | `/api/tasks/:id` | also deletes its history |
| GET | `/api/groups` | your groups |
| POST | `/api/groups` | `name` — creates it and returns the invite code |
| POST | `/api/groups/join` | `code` |
| GET | `/api/groups/:id` | members, challenges and the leaderboard |
| POST | `/api/groups/:id/tasks` | `title`, optional `platform` — copies to every member |
| DELETE | `/api/groups/:id/tasks/:taskId` | detaches everyone's copy, keeps their history |
| GET | `/api/groups/:id/messages` | group chat, oldest first; `?after=<id>` for polling |
| POST | `/api/groups/:id/messages` | `body`, optional `file` (multipart) |
| GET | `/api/groups/:id/messages/:messageId/file` | download an attachment |
| POST | `/api/groups/:id/leave` | |
| DELETE | `/api/groups/:id` | creator only |
| POST | `/api/sync` | check every linked platform and fill in the days it confirms |
| POST | `/api/tasks/:id/sync` | the same, for one task |
| POST | `/api/tasks/:id/complete` | optional `date`, defaults to today |
| DELETE | `/api/tasks/:id/complete/:date` | undo |

Everything except register/login requires the cookie and is scoped to the signed-in user.

## Useful commands

```bash
npx prisma studio            # browse the database (backend/)
npm run typecheck            # frontend type check
docker compose down -v       # wipe the database volume and start over
```
