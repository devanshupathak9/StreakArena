import type { TaskSummary } from "./api";

export type Category = "coding" | "learning" | "health" | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  coding: "Coding",
  learning: "Learning",
  health: "Health",
  other: "Other",
};

const CODING = new Set(["github", "leetcode", "codeforces"]);

/**
 * There is no category column in the schema, and inventing one would mean asking
 * for it twice. A task's platform already says what kind of thing it is, and for
 * manual tasks the title does — so the filter reads what's there.
 */
export function categoryOf(task: TaskSummary): Category {
  const platform = task.platform?.id;
  if (platform && CODING.has(platform)) return "coding";
  if (platform === "duolingo") return "learning";
  if (platform === "chesscom") return "other";

  const text = task.title.toLowerCase();
  if (/read|book|page|study|learn|course|lecture|revis/.test(text)) return "learning";
  if (/gym|workout|run|lift|exercise|yoga|meditat|walk|sleep|water|steps/.test(text)) {
    return "health";
  }
  return "other";
}
