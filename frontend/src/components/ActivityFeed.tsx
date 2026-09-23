import { Link } from "react-router-dom";
import { Check, Flame, Trophy, Users } from "lucide-react";
import type { GroupSummary, RecentEvent } from "../lib/api";
import { formatWhen } from "../lib/dates";

type Props = { recent: RecentEvent[]; groups: GroupSummary[] | null; bestStreak: number };

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
function build(recent: RecentEvent[], groups: GroupSummary[] | null, bestStreak: number): Item[] {
  const items: Item[] = recent.map((event) => ({
    key: `done-${event.taskId}-${event.localDate}`,
    kind: "done",
    text: `Completed “${event.title}”${event.source === "synced" ? " — verified" : ""}`,
    when: formatWhen(event.at),
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

export default function ActivityFeed({ recent, groups, bestStreak }: Props) {
  const items = build(recent, groups, bestStreak);

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
