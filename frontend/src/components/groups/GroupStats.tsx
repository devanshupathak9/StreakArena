import { Check, Flame, Trophy, Users } from "lucide-react";
import type { Standing } from "../../lib/api";

type Props = { standings: Standing[]; challengeCount: number };

export default function GroupStats({ standings, challengeCount }: Props) {
  // Every figure here is a fold over the same standings the board below renders,
  // so a card can never claim something the table contradicts.
  const streakDays = standings.reduce(
    (sum, member) => sum + member.challenges.reduce((n, c) => n + c.totalDays, 0),
    0,
  );
  const verified = standings.reduce((sum, member) => sum + member.score, 0);
  const activeToday = standings.filter((member) => member.doneToday > 0).length;
  const yourRank = standings.findIndex((member) => member.isYou) + 1;

  return (
    <section className="stat-row" aria-label="Group numbers">
      <div className="stat-card">
        <span className="stat-icon stat-icon-flame">
          <Flame size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{streakDays}</span>
          <span className="stat-label">Group streak days</span>
          <span className="stat-support">Everyone's days, added up</span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-done">
          <Check size={19} strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{verified}</span>
          <span className="stat-label">Verified days</span>
          <span className="stat-support">
            {challengeCount} challenge{challengeCount === 1 ? "" : "s"} running
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-groups">
          <Users size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">
            {activeToday}/{standings.length}
          </span>
          <span className="stat-label">Active today</span>
          <span className="stat-support">
            {activeToday === standings.length ? "Everyone showed up" : "In their own timezone"}
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-rank">
          <Trophy size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{yourRank > 0 ? `#${yourRank}` : "—"}</span>
          <span className="stat-label">Your rank here</span>
          <span className="stat-support">
            {yourRank === 1 ? "Top of the board!" : yourRank > 0 ? "Climbing up!" : "Join a challenge"}
          </span>
        </div>
      </div>
    </section>
  );
}
