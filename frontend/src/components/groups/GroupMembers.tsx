import { Crown } from "lucide-react";
import type { Standing } from "../../lib/api";
import Avatar from "../Avatar";

type Props = { standings: Standing[]; ownerId: string; compact?: boolean };

const MEDALS = ["gold", "silver", "bronze"];

export default function GroupMembers({ standings, ownerId, compact = false }: Props) {
  const shown = compact ? standings.slice(0, 6) : standings;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Members ({standings.length})</h2>
        {compact && standings.length > shown.length && (
          <span className="muted small">+{standings.length - shown.length} more</span>
        )}
      </div>

      <ol className="member-list">
        {shown.map((member, index) => {
          const streak = member.challenges.reduce((max, c) => Math.max(max, c.currentStreak), 0);
          const owner = member.userId === ownerId;
          return (
            <li
              key={member.userId}
              className={member.isYou ? "member-row member-you" : "member-row"}
            >
              <span className="member-rank">
                {index < 3 ? (
                  <span className={`medal medal-${MEDALS[index]}`}>{index + 1}</span>
                ) : (
                  <span className="num">{index + 1}</span>
                )}
              </span>

              <span className="member-avatar">
                <Avatar
                  username={member.username}
                  displayName={member.displayName}
                  avatarUrl={member.avatarUrl}
                  size={32}
                />
                {/* Green means they've settled something today, in their own zone. */}
                <span
                  className={member.doneToday > 0 ? "presence is-active" : "presence"}
                  title={member.doneToday > 0 ? "Active today" : "Nothing recorded today"}
                />
              </span>

              <span className="member-detail">
                <span className="member-label">
                  {member.displayName || member.username}
                  {owner && (
                    <span className="chip chip-owner" title="Group owner">
                      <Crown size={11} strokeWidth={2.4} aria-hidden="true" />
                      Admin
                    </span>
                  )}
                  {member.isYou && <span className="chip chip-you">you</span>}
                </span>
                <span className="muted small">
                  <span className="flame-icon" aria-hidden="true">
                    🔥
                  </span>{" "}
                  {streak} day{streak === 1 ? "" : "s"} · {member.doneToday} done today
                </span>
              </span>

              <span className="member-points num">{member.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
