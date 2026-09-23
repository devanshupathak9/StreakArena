// The platforms a task can be attached to. A linked account is just a handle —
// StreakArena stores no credentials and never talks to these sites on your behalf;
// the handle is what turns a task into a one-click link to the place you do the work.

const PLATFORMS = [
  {
    id: "github",
    label: "GitHub",
    emoji: "🟩",
    placeholder: "octocat",
    // 1-39 alphanumerics, single hyphens allowed but not at either end.
    pattern: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
    hint: "Contribution calendar — the green tiles.",
    url: (handle) => `https://github.com/${handle}`,
  },
  {
    id: "leetcode",
    label: "LeetCode",
    emoji: "🟧",
    placeholder: "your_handle",
    pattern: /^[A-Za-z0-9_.-]{1,39}$/,
    hint: "Any day you submitted a solution.",
    url: (handle) => `https://leetcode.com/u/${handle}/`,
  },
  {
    id: "codeforces",
    label: "Codeforces",
    emoji: "🔵",
    placeholder: "tourist",
    pattern: /^[A-Za-z0-9_.-]{1,39}$/,
    hint: "Any day you submitted, solved or not.",
    url: (handle) => `https://codeforces.com/profile/${handle}`,
  },
  {
    id: "chesscom",
    label: "Chess.com",
    emoji: "♟️",
    placeholder: "hikaru",
    pattern: /^[A-Za-z0-9_-]{3,25}$/,
    hint: "Any day you finished a game.",
    url: (handle) => `https://www.chess.com/member/${handle}`,
  },
  {
    id: "codewars",
    label: "Codewars",
    emoji: "🥋",
    placeholder: "your_handle",
    pattern: /^[A-Za-z0-9_.-]{1,40}$/,
    hint: "Any day you completed a kata.",
    url: (handle) => `https://www.codewars.com/users/${handle}`,
  },
  {
    id: "lichess",
    label: "Lichess",
    emoji: "♞",
    placeholder: "your_handle",
    pattern: /^[A-Za-z0-9_-]{2,30}$/,
    hint: "Any day you finished a game.",
    url: (handle) => `https://lichess.org/@/${handle}`,
  },
  {
    id: "gitlab",
    label: "GitLab",
    emoji: "🦊",
    placeholder: "your_handle",
    pattern: /^[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/,
    hint: "Pushes, merge requests and issues on public projects.",
    url: (handle) => `https://gitlab.com/${handle}`,
  },
  {
    id: "atcoder",
    label: "AtCoder",
    emoji: "🟦",
    placeholder: "your_handle",
    // AtCoder itself publishes no API; the community kenkoooo mirror does, and it
    // answers 200 with an empty list for a handle that doesn't exist — so a typo
    // here looks like "no activity" rather than an error.
    pattern: /^[A-Za-z0-9_]{3,16}$/,
    hint: "Any day you submitted, via the kenkoooo mirror.",
    url: (handle) => `https://atcoder.jp/users/${handle}`,
  },
  {
    id: "duolingo",
    label: "Duolingo",
    emoji: "🦉",
    placeholder: "your_handle",
    pattern: /^[A-Za-z0-9_.-]{1,39}$/,
    hint: "Your streak, straight from Duolingo.",
    url: (handle) => `https://www.duolingo.com/profile/${handle}`,
  },
];

const BY_ID = new Map(PLATFORMS.map((platform) => [platform.id, platform]));

export function getPlatform(id) {
  return BY_ID.get(id) ?? null;
}

export function isPlatformId(id) {
  return BY_ID.has(id);
}

export function validateHandle(id, handle) {
  const platform = getPlatform(id);
  if (!platform) return "Unknown platform";
  if (!handle) return "Enter your handle";
  if (!platform.pattern.test(handle)) return `That doesn't look like a ${platform.label} handle`;
  return null;
}

/** The catalog as the client sees it — regexes and functions don't cross the wire. */
export function platformCatalog() {
  return PLATFORMS.map(({ id, label, emoji, placeholder, hint }) => ({
    id,
    label,
    emoji,
    placeholder,
    hint,
  }));
}

/** What a linked account looks like in a response. */
export function publicAccount(account) {
  const platform = getPlatform(account.platform);
  return {
    platform: account.platform,
    label: platform?.label ?? account.platform,
    emoji: platform?.emoji ?? "🔗",
    handle: account.handle,
    url: platform ? platform.url(account.handle) : null,
    lastSyncedAt: account.lastSyncedAt ?? null,
    lastSyncError: account.lastSyncError ?? null,
  };
}
