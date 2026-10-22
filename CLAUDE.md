# StreakArena — working notes

A centralised streak tracker. You link your public handles on nine sites (GitHub, GitLab,
LeetCode, Codeforces, Codewars, AtCoder, Chess.com, Lichess, Duolingo), tag tasks with a
platform, and **sync** reads your real activity back — so a streak is evidence rather than
self-report. Groups let friends race the same challenges.

`docs/` holds the reference material: `architecture.md` for how the pieces fit,
`platforms.md` for what each adapter reads, `ui-spec.md` for the design. This file is the
stuff you'd otherwise learn by breaking something.

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
- **`passwordHash` is nullable.** A Google-only account has none, so anything that compares a
  password must guard on it first — `verifyPassword(password, null)` is not a failed login, it's
  a crash. `publicUser` exposes `hasPassword` / `googleLinked` so the UI can tell them apart.
- **The OAuth state cookie must stay `sameSite: "lax"`.** The Google callback arrives as a
  top-level navigation from accounts.google.com; `"strict"` withholds the cookie and every
  sign-in fails the state check with no clue why.
- **Google sign-in can never work on `http://187.77.130.9:8080`.** Google requires an HTTPS
  redirect URI and rejects raw IP addresses — that deployment fails both rules. `localhost` is
  the one exemption, which is why dev works. Set `APP_ORIGIN=http://localhost:5173` in dev so
  the callback lands back on Vite rather than on the API port.

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
- **A task is `daily` or `once`, and only `daily` has a streak.** A one-off is a single job on a
  single day: no tiles, `currentStreak` 0, and excluded from the heatmap totals *and* the global
  leaderboard — otherwise a to-do list could buy a ranking. `kind` is immutable after creation,
  because flipping a 40-day habit into a to-do would reinterpret history recorded under different
  rules; `dueDate` can be moved, since "I'll do it tomorrow" is ordinary. Group challenges are
  always `daily`.
- **Colour carries meaning, and the roles are fixed.** Flame orange = a live streak and the
  XP bar. Green = a verified completion. Blue = clickable. Gold, silver and bronze = rank.
  Everything else is ink. Never borrow one role's colour for another's job.
- **A self-reported day must never look like a verified one.** `Tile.verified` exists for exactly
  this; verified days are green, self-reported are neutral grey.
- **Google sign-in never auto-links on a matching email.** Registration doesn't verify email, so
  anyone can sign up with an address they don't own; linking on a match would hand the real owner
  an account whose password someone else still knows. A matching email is refused
  (`?error=google-exists`) and linking has to start from inside a session that already proved it
  owns the account. Verifying email at signup is what would make auto-linking safe.
- **Google can't be disconnected from an account with no password**, because that removes the
  only way back in. The route refuses it and the UI explains why rather than hiding the button.
- **The four-colour Google G is the one mark that ignores the palette rules.** Google's branding
  guidelines forbid recolouring it. The exception stops at the logo — the button's own surface and
  border are ordinary tokens, and blue stays the app's "clickable".

## Before touching the frontend

The design is **specified, not open**. Read `docs/ui-spec.md` (the user's own build
spec) and `docs/images/reference.png` (the mockup it came from) before changing any
screen. `.claude/skills/streakarena-ui/SKILL.md` and `streakarena-sidebar/SKILL.md`
record what carries over that the spec doesn't state.

An earlier brief described the UI as a bordered standings board with no hero, no cards and
no gradients. **The user replaced that with the reference mockup.** Cards, the hero banner,
the five-stat row and the quote tiles are deliberate — don't "fix" them back.

Routes are `/` (dashboard), `/tasks`, `/groups`, `/groups/:id`, `/leaderboard`, `/profile`,
`/about`. `/global` redirects to `/leaderboard`.

Three palette values were lightened from the spec because they failed AA as small text;
each is commented at the token in `styles.css` with the measured ratio. Colour roles are
still fixed: flame = a live streak, green = verified, blue = clickable, gold/silver/bronze
= rank, everything else ink.

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

- **Google sign-in is built but has no credentials.** `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` are unset, so `/api/auth/config` reports
  `{"google":false}` and the button is hidden. Every branch was tested against a stubbed token
  endpoint; what has never run is a real Google round trip. The domain is `streakarena.app`
  (owned, HSTS-preloaded, so HTTPS is the only possibility there).
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
- **Detail adapters are a separate, optional layer.** `fetchActiveDays` answers *which days*;
  `fetchActivityDetail` answers *doing what*, and only LeetCode implements it. Detail is written
  inside a `try` that logs and swallows, because losing the problem names must never turn a
  working sync into a failed one. Rows live in `PlatformActivity` rather than being fetched for
  display because LeetCode caps `recentAcSubmissionList` at 20 whatever `limit` asks for
  (measured: 50 and 100 both return 20) — storing accumulates history the live endpoint has
  already forgotten. The unique key is `(userId, platform, localDate, externalId)`, so re-syncing
  adds nothing and the same problem solved twice in a day counts once.
- **`platform.action` is the "go do it" link**, used when a task isn't done yet. Null for GitHub
  and GitLab on purpose: there's no page you visit to make a commit, and a link that lands on a
  profile is worse than none. LeetCode additionally has a live daily-challenge suggestion, cached
  per UTC day in `sync.js` so it costs one upstream call a day rather than one a page load.
- **Nine platforms sync.** Documented and supported: Codeforces, Chess.com, Codewars, Lichess,
  GitLab, GitHub (token optional). Community mirror: AtCoder, via kenkoooo — AtCoder publishes
  no API, and the mirror answers `200 []` for a handle that doesn't exist, so a typo there reads
  as "no activity" rather than an error. Undocumented: LeetCode, Duolingo.
- **Paged adapters keep what they got.** Codewars, GitLab and AtCoder page; a failure after the
  first page returns the days already collected rather than failing the platform, because sync
  only ever adds. GitLab 500s on deep offset pages for very busy accounts — that's the case this
  exists for.
- **LeetCode's two adapters disagree about midnight.** The day adapter buckets
  `submissionCalendar` timestamps in **UTC**; the detail adapter buckets submissions in the
  **user's timezone**, which is what the product rule says. For a solve within the offset of
  midnight, the problem can therefore be listed under a day whose tile isn't green. Fixing it
  means changing the day adapter, which changes what counts as a streak day — left alone
  deliberately rather than changed quietly. The day adapter also counts *all* submissions while
  the detail list is accepted-only, so a day can be green with no problems listed.
- **Lichess is the slow one**, ~10s for an active player: the export streams games, and even with
  every non-timestamp field switched off there are hundreds of them. It sits inside the 20s
  timeout, but it's the first thing to feel slow if the budget ever tightens.
- **Stack Overflow was looked at and skipped.** The API is free and works, but it keys on a
  numeric user id rather than a handle, which doesn't fit "paste your username".
