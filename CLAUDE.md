# StreakArena — working notes

A centralised streak tracker. You link your public handles (GitHub, LeetCode, Codeforces,
Chess.com, Duolingo), tag tasks with a platform, and **sync** reads your real activity back — so a
streak is evidence rather than self-report. Groups let friends race the same challenges.

Read `ARCHITECTURE.md` for how the pieces fit. This file is the stuff you'd otherwise have to
learn by breaking something.

## Running it

The app runs **in Docker on this machine**, published on port 8080:

```bash
docker compose up -d --build     # db + app
docker compose logs -f app
```

There is no separate frontend server in production: the React bundle is built into the image and
served by Express, so the whole app is one origin on one port. For fast backend iteration you can
instead run `cd backend && npm run dev` against the same database (it's published on
`127.0.0.1:5433`), but **remember the container is still serving :8080** — edit-then-test against
:4000, and rebuild the image before claiming anything works in the deployed app.

`backend/.env` and root `.env` both exist and are gitignored. Root `.env` feeds docker-compose.

## Things that will bite you

- **`npm start` is not nodemon.** It won't pick up your edits. Restart it, or you'll debug a
  phantom failure against stale code. This has already happened once.
- **Never put a process name in the same command line as `pkill -f`** — the pattern matches your
  own shell and kills it (exit 144). Find the PID first (`ss -tlnp | grep :4000`) and kill that.
- **`COOKIE_SECURE=false` is load-bearing.** This deployment is plain HTTP; a `Secure` cookie is
  silently dropped by browsers and login looks like it does nothing.
- **Chat attachments live in the `streakarena-uploads` volume, not the database.** Deleting a
  message, group or user cascades the *rows* but leaves the blob on disk — there is no sweeper
  yet. Never `rm /app/uploads/*` to tidy up: other people's files are in there. Delete the one
  `filePath` you mean.
- **The database volume outlives `docker compose down`.** Accounts from earlier sessions are still
  in there. Two of them (`devanshu`, `someone`) are the user's own test data — leave them alone.
- **`UPLOAD_DIR` defaults to `backend/uploads` on a host run** and is set to the mounted volume in
  the container. It used to default to the absolute container path, which crashed `npm start`
  outside Docker at import time — with an old server still bound to 4000, that looks like your
  edits silently not applying.
- **Prisma needs `openssl`** in the runtime image (already in the Dockerfile) and a `generate`
  after any schema change.

## Conventions this codebase keeps

- Backend is **plain JavaScript, ESM, no build step**. Don't introduce TypeScript there.
- Frontend is TypeScript. `npx tsc --noEmit` must pass; `npm run build` runs it.
- Every task query is **scoped by `userId` in the `where` clause**, so another user's id simply
  matches nothing. Keep doing this instead of fetching-then-checking.
- Comments explain *why*, not *what*. Match the existing density — sparse, but present wherever a
  decision would otherwise look arbitrary.
- Dates crossing the wire are bare `YYYY-MM-DD` strings already in the user's timezone. The
  frontend formats them as UTC so the browser's own offset can't shift them.

## Product rules that are deliberate

- **A day belongs to the user's timezone.** Completions store the calendar date in *their* zone, so
  all streak maths is plain date arithmetic. Group and global leaderboards compute each member's
  streak against their own "today" — that's why ranking can't be a SQL aggregate.
- **An unmarked today counts back from yesterday**, so a streak doesn't read as broken at 9am.
- **Sync is additive.** It never overwrites a manual day and never revokes a day a platform stopped
  reporting. `TaskCompletion.source` is `'manual' | 'synced'`.
- **Platform-backed tasks have no manual control** — their tiles are read-only, because sync is
  what proves them. **Tasks with no platform keep the manual button**, because there's nothing to
  ask. Don't "fix" this asymmetry; it's the point.
- **Groups can't cost anyone a streak.** Leaving, removing a challenge, or deleting the group all
  detach the task (`groupTaskId` → null) and leave the history with its owner. `SetNull`, never
  `Cascade`.
- **Not every streak has an API.** The task composer leads with manual presets (reading, workout,
  meditation) on purpose — platform tasks are the flagship, not the only citizen.
- **Colour carries meaning, and the roles are fixed.** Flame orange = a live streak only. Green =
  a verified completion. Amber = today unmarked and at risk. Blue = clickable, and nothing static.
  Everything else is ink. The user explicitly rejected an orange-everywhere UI — don't reintroduce
  it, and never borrow one role's colour for another's job.
- **A self-reported day must never look like a verified one.** `Tile.verified` exists for exactly
  this; verified days are green, self-reported are neutral grey.

## Before touching the frontend

Read `.claude/skills/streakarena-ui/SKILL.md` first, and
`.claude/skills/streakarena-sidebar/SKILL.md` for anything touching navigation or the app shell. It is the user's own design brief: StreakArena
should read as a **contest standings board**, not a habit tracker or a SaaS dashboard. It fixes the
colour roles, the type (Archivo + Archivo Narrow, tabular figures on every number, the streak count
as display type), the layout rules (owed-today first; tasks are list rows, not cards; the
leaderboard *is* the group page), and a list of AI-generated tells to avoid — identical rounded
cards, three-stat-card rows, `A · B · C` meta strings, emoji as section icons, hover lift on
everything.

The sidebar brief sets the nav structure (Dashboard / Groups / Global only, Profile in the account
row, About in the account menu), the today block, lucide-react icons at 18px/1.75, the 248px ↔ 64px
rail toggled with `[`, and a bottom tab bar under 768px. The nav adds **no requests of its own**:
`AppDataProvider` holds the dashboard and group list, and both the pages and the sidebar read it.

Its process is worth following literally: plan the palette and wireframe first, then check the plan
for anything you'd produce for any habit app, and finish by removing one thing.

## Verifying work

There is **no test suite and no browser in the agent session.** So:

1. `npx tsc --noEmit` in `frontend/`.
1b. For UI work, check AA contrast numerically rather than by eye — there's no browser here, and
   four pairs failed when this was last measured. 4.5:1 for body text, 3:1 for large.
2. Exercise the real endpoints with curl against `http://localhost:8080` (or `:4000` in dev),
   including the failure cases — that's how the Chess.com empty-month 404 bug was found.
3. Clean up any test accounts you create:
   `docker exec streakarena-db psql -U streak -d streakarena -c "DELETE FROM \"User\" WHERE email='...'"`.
4. Say plainly that the layout is unverified. Don't claim a page looks right.

## Open threads

- **No GitHub token yet.** Sync falls back to the public events API: ~90 days, 60 req/hr per IP
  shared by everyone. Adding `GITHUB_TOKEN` to `.env` upgrades it to the real contribution
  calendar automatically — the code path already exists.
- **Work lands on `master` and is pushed** to `github.com:devanshupathak9/StreakArena`. Commits
  are feature-sized with bodies explaining *why*; the shared files (`index.js`, `schema.prisma`,
  `api.ts`, `styles.css`) change for almost every feature, so slicing finer than that produces
  commits that don't build.
- **Orphaned attachments accumulate.** Rows cascade, files don't. A sweeper (delete blobs with no
  matching `filePath`) is the fix when it matters.
- **Global ranking reads every user's completions** and folds them in JS. Fine now; the fix at
  scale is a nightly snapshot table, not a cleverer query.
- LeetCode and Duolingo use undocumented endpoints. Expect them to break; every adapter is
  wrapped and reports per-platform.
