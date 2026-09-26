import type { Dashboard } from "./api";

export type Achievement = {
  id: string;
  title: string;
  subtitle: string;
  tone: "flame" | "verdict" | "accent" | "gold";
  earned: boolean;
  /** What it takes, shown whether or not it's been earned. */
  requirement: string;
};

const CODING = new Set(["github", "gitlab", "leetcode", "codeforces", "codewars", "atcoder"]);

/**
 * Earned from what the account actually did, not stored and awarded. A badge that
 * can't be checked against the rest of the page is decoration, and this app's whole
 * argument is that a claim should be provable.
 */
export function achievementsFor(
  dashboard: Dashboard | null,
  globalRank: number | null,
): Achievement[] {
  const tasks = dashboard?.tasks ?? [];
  const best = tasks.reduce((max, task) => Math.max(max, task.longestStreak), 0);
  const verifiedCoding = tasks.some(
    (task) => task.platform && CODING.has(task.platform.id) && task.syncedDays > 0,
  );
  const running = tasks.filter((task) => task.currentStreak > 0).length;

  return [
    {
      id: "streaker",
      title: "7 days",
      subtitle: "Streaker",
      tone: "flame",
      earned: best >= 7,
      requirement: "Run any streak for seven days",
    },
    {
      id: "code-warrior",
      title: "Code",
      subtitle: "Warrior",
      tone: "verdict",
      earned: verifiedCoding,
      requirement: "Have a coding platform verify a day for you",
    },
    {
      id: "top-three",
      title: "Top 3",
      subtitle: "Rank",
      tone: "accent",
      earned: globalRank !== null && globalRank <= 3,
      requirement: "Reach the top three on the leaderboard",
    },
    {
      id: "multi-tasker",
      title: "Multi-",
      subtitle: "Tasker",
      tone: "gold",
      earned: running >= 3,
      requirement: "Keep three streaks running at once",
    },
  ];
}
