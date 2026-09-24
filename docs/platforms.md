# Platforms

Nine sites can prove a task. Every one of them works the same way from the user's side:
paste a public handle in Profile, tag a task with that platform, press **Sync**. No keys,
no OAuth, no passwords — StreakArena stores a username and nothing else.

Each adapter answers exactly one question: **which calendar days did this handle do
something on?** Everything after that — streaks, tiles, leaderboards — is shared code.

## What counts as a day

| Platform | A day counts when you… | API status | Notes |
| --- | --- | --- | --- |
| **GitHub** | Have a contribution | Official | See [token](#github-token) below |
| **GitLab** | Push, open an MR, file an issue | Official, no auth | Public projects only |
| **LeetCode** | Submit a solution | **Undocumented** | Can break without notice |
| **Codeforces** | Submit, solved or not | Official, no auth | Documented and supported |
| **Codewars** | Complete a kata | Official, no auth | Paged, newest first |
| **AtCoder** | Submit | **Community mirror** | See [AtCoder](#atcoder) below |
| **Chess.com** | Finish a game | Official, no auth | Monthly archives |
| **Lichess** | Finish a game | Official, no auth | The slow one, ~10s |
| **Duolingo** | Keep your streak alive | **Undocumented** | Reads Duolingo's own streak |

Sync is **additive**. It never overwrites a day you marked by hand and never revokes a day
a platform stopped reporting. A platform that fails reports that one failure — it does not
take the rest of the sync down with it.

## The ones with caveats

### GitHub token

Without `GITHUB_TOKEN` set, GitHub sync falls back to the public events API: roughly 90 days
of history and **60 requests an hour per IP**, shared by everyone on the server. With a token
it reads the real contribution calendar — exact per-day counts for a whole year. The code path
already exists; adding the token to `.env` is the whole change.

### AtCoder

AtCoder publishes no API at all. The adapter uses the community [kenkoooo](https://kenkoooo.com/atcoder/)
mirror, which brings two consequences:

- It answers `200 []` for a handle that doesn't exist, so **a typo reads as "no activity"**
  rather than an error. Every other platform 404s on a bad handle.
- Submissions come back **oldest-first and truncated**. Naively reading one page would
  silently drop your most recent days — the worst possible failure for a streak tracker.
  The adapter walks `from_second` forward past the newest submission it has seen.

### Lichess

The export streams the games themselves, not a summary. Every field that isn't a timestamp
is switched off (`moves`, `tags`, `clocks`, `evals`, `opening`) and the cap is 400 games,
which still takes about ten seconds for an active player. It sits inside the 20-second
timeout, but it is the first thing that will feel slow if that budget tightens.

### Paged adapters keep partial results

Codewars, GitLab and AtCoder page. If a page **after the first** fails, the adapter returns
the days it already collected instead of failing the platform. GitLab returns `500` on deep
offset pages for very busy accounts — that is the case this exists for. Since sync only ever
adds, partial data is still true data.

## Looked at and rejected

**Strava.** Free, but two independent blockers. Every endpoint is `401` without per-athlete
OAuth — there is no public read of any kind, so "paste your handle" cannot work. More
decisively, the API Agreement states that Strava data *"can only be displayed or disclosed
in your Developer Application to that user"* and that data about other users *"even if such
data is publicly viewable… may not be displayed or disclosed."* A group leaderboard showing
your Strava streak to your friends is exactly that. Rate limits, for the record: 100 reads
per 15 minutes and 1,000 per day, **per application**, not per user.

**Stack Overflow.** The API is free, works, and allows 300 calls a day without a key. It
keys on a **numeric user id** rather than a username, which does not fit the one interaction
this app has. Revisit only if handles ever stop being the way accounts are linked.

**Fitness platforms generally.** Fitbit, Garmin, Whoop and Oura are all OAuth-only, same as
Strava. Fitness is an OAuth world. The manual **Workout** preset exists for this reason —
not every streak has an API, and the task composer leads with manual presets on purpose.

## Adding another

1. Add an entry to `backend/src/platforms.js`: id, label, handle `pattern`, `hint`, and a
   `url` builder for the profile link.
2. Add an adapter to `backend/src/sync.js` returning a `Set` of `YYYY-MM-DD` strings in the
   user's timezone. Use `getJson`, or `getText` if the response isn't JSON.
3. Register it in the `ADAPTERS` map.
4. Add a brand mark to `frontend/src/components/ui/PlatformIcon.tsx` and a category in
   `frontend/src/lib/categories.ts`.

Then prove it: link a real handle, sync, and check the days landed inside the window and
that a second sync adds zero. Test a bad handle too — that is how the Chess.com
empty-month bug was found.
