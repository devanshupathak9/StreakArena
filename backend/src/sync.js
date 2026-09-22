// Reading activity back from the platforms themselves, so a streak is evidence
// rather than self-report. Each adapter answers one question: which calendar days
// did this handle do something on? Everything else is shared.
//
// Only Codeforces and Chess.com publish a documented, supported API here. GitHub's
// is official but wants a token for the good endpoint; LeetCode's and Duolingo's are
// undocumented and can change without notice — so every adapter is wrapped, and a
// platform that fails reports the failure instead of taking the whole sync down.

import { addDays, dateInTz } from "./streak.js";

// Chess.com monthly archives run to a few MB for an active player, so the budget is
// generous rather than tight.
const TIMEOUT_MS = 20_000;

// Chess.com and Duolingo reject requests without a descriptive agent.
const USER_AGENT = "StreakArena/0.1 (streak tracker; +https://github.com/devanshupathak9/StreakArena)";

async function getJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...options.headers },
    });
    // Some endpoints use 404 for "nothing here", which is not the same as a bad handle.
    if (response.status === 404) {
      if (options.notFoundOk) return null;
      throw new Error("That handle wasn't found");
    }
    if (response.status === 403 || response.status === 429) {
      throw new Error("Rate limited — try again in a few minutes");
    }
    if (!response.ok) throw new Error(`The API returned ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The API took too long to answer");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Every calendar date from `from` to `to` inclusive. */
function datesBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/**
 * GitHub. With a token the GraphQL contribution calendar gives exact per-day counts
 * for a whole year — the green tiles themselves. Without one we fall back to public
 * events, which is unauthenticated but only reaches ~90 days and 60 requests an hour
 * per IP, shared across everyone using this server.
 */
async function github(handle, since, today, timezone) {
  const token = process.env.GITHUB_TOKEN;

  if (token) {
    const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
      user(login:$login){
        contributionsCollection(from:$from,to:$to){
          contributionCalendar{ weeks{ contributionDays{ date contributionCount } } }
        }
      }
    }`;
    const body = await getJson("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          login: handle,
          from: `${since}T00:00:00Z`,
          to: `${today}T23:59:59Z`,
        },
      }),
    });

    if (body.errors?.length) throw new Error(body.errors[0].message);
    const user = body.data?.user;
    if (!user) throw new Error("That handle wasn't found");

    const weeks = user.contributionsCollection.contributionCalendar.weeks;
    // These dates are already calendar days on GitHub's side, so they're used as-is.
    return new Set(
      weeks
        .flatMap((week) => week.contributionDays)
        .filter((day) => day.contributionCount > 0)
        .map((day) => day.date),
    );
  }

  const events = await getJson(
    `https://api.github.com/users/${encodeURIComponent(handle)}/events/public?per_page=100`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!Array.isArray(events)) throw new Error("Unexpected response from GitHub");
  return new Set(events.map((event) => dateInTz(new Date(event.created_at), timezone)));
}

/**
 * LeetCode's undocumented GraphQL endpoint. `submissionCalendar` is a JSON *string*
 * of unix-second → submission count, already bucketed into UTC days — so the keys are
 * read as UTC dates rather than re-derived in the user's timezone, which would shift
 * every day by one.
 */
async function leetcode(handle, since, today) {
  const years = new Set([since.slice(0, 4), today.slice(0, 4)]);
  const active = new Set();

  for (const year of years) {
    const body = await getJson("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
      body: JSON.stringify({
        query: `query($username:String!,$year:Int){
          matchedUser(username:$username){ userCalendar(year:$year){ submissionCalendar } }
        }`,
        variables: { username: handle, year: Number(year) },
      }),
    });

    if (body.errors?.length) throw new Error(body.errors[0].message);
    const user = body.data?.matchedUser;
    if (!user) throw new Error("That handle wasn't found");

    const calendar = JSON.parse(user.userCalendar?.submissionCalendar ?? "{}");
    for (const [seconds, count] of Object.entries(calendar)) {
      if (count > 0) active.add(new Date(Number(seconds) * 1000).toISOString().slice(0, 10));
    }
  }
  return active;
}

/** Codeforces: official, documented, no key. Any submission counts as practice. */
async function codeforces(handle, since, today, timezone) {
  const body = await getJson(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`,
  );
  if (body.status !== "OK") throw new Error(body.comment ?? "Codeforces rejected the request");

  return new Set(
    body.result.map((submission) =>
      dateInTz(new Date(submission.creationTimeSeconds * 1000), timezone),
    ),
  );
}

/**
 * Chess.com: official and documented, but games are archived per month and a month
 * you didn't play 404s. The archives index lists only the months that actually exist,
 * so asking it first turns "which months do I fetch" into a cheap lookup and avoids
 * mistaking an empty month for a missing account.
 */
async function chesscom(handle, since, today, timezone) {
  const player = encodeURIComponent(handle.toLowerCase());
  const index = await getJson(`https://api.chess.com/pub/player/${player}/games/archives`);
  if (!index?.archives) throw new Error("That handle wasn't found");

  const months = new Set();
  for (const date of datesBetween(since, today)) months.add(date.slice(0, 7).replace("-", "/"));

  const active = new Set();
  for (const url of index.archives.filter((u) => months.has(u.slice(-7)))) {
    const body = await getJson(url, { notFoundOk: true });
    for (const game of body?.games ?? []) {
      if (game.end_time) active.add(dateInTz(new Date(game.end_time * 1000), timezone));
    }
  }
  return active;
}

/**
 * Duolingo publishes no per-day history, only the streak itself — so the current
 * streak's date range is expanded back into days. That means a synced Duolingo streak
 * is only ever as long as Duolingo currently says it is, which is exactly the number
 * we want anyway.
 */
async function duolingo(handle, since, today) {
  const body = await getJson(
    `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(handle)}&fields=users%7Bstreak,streakData%7D`,
  );
  const user = body.users?.[0];
  if (!user) throw new Error("That handle wasn't found");

  const current = user.streakData?.currentStreak;
  if (current?.startDate && current?.endDate) {
    return new Set(datesBetween(current.startDate, current.endDate).filter((date) => date >= since));
  }

  // Older shape: just a length, so count it back from today.
  const length = Number(user.streak ?? 0);
  if (!length) return new Set();
  return new Set(datesBetween(addDays(today, -(length - 1)), today).filter((date) => date >= since));
}

const ADAPTERS = { github, leetcode, codeforces, chesscom, duolingo };

export function canSync(platform) {
  return Object.hasOwn(ADAPTERS, platform);
}

/**
 * The days `handle` was active on `platform`, between `since` and `today` inclusive.
 * Throws with a message meant for the user — the caller turns that into per-platform
 * feedback rather than a failed request.
 */
export async function fetchActiveDays(platform, handle, since, today, timezone) {
  const adapter = ADAPTERS[platform];
  if (!adapter) throw new Error("That platform can't be synced");

  const days = await adapter(handle, since, today, timezone);
  // Whatever the source said, only days inside the window can become completions.
  return new Set([...days].filter((date) => date >= since && date <= today));
}
