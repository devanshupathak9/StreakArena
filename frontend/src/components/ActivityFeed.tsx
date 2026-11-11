import { Link } from "react-router-dom";
import { Check, Flame, Trophy, Users } from "lucide-react";
import type { GroupSummary, RecentEvent } from "../lib/api";
import { relativeDay } from "../lib/dates";

type Props = { recent: RecentEvent[]; groups: GroupSummary[] | null; bestStreak: number; today: string };

type Item = {
  key: string;
  kind: "done" | "group" | "rank" | "streak";
  text: string;
  when: string;
};

/**
 * Built from what actually happened: completions carry a real timestamp, and the
 * rank and streak lines are read off the same data the stat row shows. Nothing
 * here is invented, so the feed can't claim something the board contradicts.
 */
function build(
  recent: RecentEvent[],
  groups: GroupSummary[] | null,
  bestStreak: number,
  today: string,
): Item[] {
  /*
   * One line per task, not per day. A first sync backfills weeks at once and every
   * row shares the same "just now" timestamp, which used to fill the feed with six
   * identical lines. Days are named by their own date in the user's zone ("Today",
   * "Yesterday") because that's what the completion is about, not when it was
   * recorded.
   */
  const byTask = new Map<string, RecentEvent>();
  for (const event of recent) {
    const seen = byTask.get(event.taskId);
    if (!seen || event.localDate > seen.localDate) byTask.set(event.taskId, event);
  }
  const items: Item[] = [...byTask.values()]
    .sort((a, b) => b.localDate.localeCompare(a.localDate))
    .map((event) => ({
      key: `done-${event.taskId}`,
      kind: "done",
      text:
        // No day count: `recent` is capped server-side, so a count here would read
        // as the streak and contradict it.
        `Completed “${event.title}”` + (event.source === "synced" ? " — verified" : ""),
      when: relativeDay(event.localDate, today),
    }));

  const ranked = (groups ?? []).filter((group) => group.yourRank !== null);
  if (ranked.length > 0) {
    const best = ranked.reduce((a, b) => (a.yourRank! <= b.yourRank! ? a : b));
    items.push({
      key: `rank-${best.id}`,
      kind: "rank",
      text: `You're #${best.yourRank} in ${best.name}`,
      when: "now",
    });
  }

  for (const group of groups ?? []) {
    items.push({
      key: `group-${group.id}`,
      kind: "group",
      text: `In the group “${group.name}”`,
      when: `${group.memberCount} member${group.memberCount === 1 ? "" : "s"}`,
    });
  }

  if (bestStreak > 0) {
    items.push({
      key: "streak",
      kind: "streak",
      text: `Longest run going: ${bestStreak} day${bestStreak === 1 ? "" : "s"}`,
      when: "live",
    });
  }

  return items.slice(0, 6);
}

const ICONS = {
  done: Check,
  group: Users,
  rank: Trophy,
  streak: Flame,
} as const;

export default function ActivityFeed({ recent, groups, bestStreak, today }: Props) {
  const items = build(recent, groups, bestStreak, today);

  return (
    <section className="card feed-card">
      <div className="card-head">
        <h2>Recent activity</h2>
        <Link to="/tasks" className="link-button">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="empty">Nothing recorded yet. Your first completed day shows up here.</p>
      ) : (
        <ol className="feed">
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.key} className="feed-item">
                <span className={`feed-icon feed-icon-${item.kind}`} aria-hidden="true">
                  <Icon size={14} strokeWidth={2.6} />
                </span>
                <span className="feed-body">
                  <span className="feed-text">{item.text}</span>
                  <span className="feed-when">{item.when}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
