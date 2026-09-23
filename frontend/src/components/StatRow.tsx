import { Link } from "react-router-dom";
import { BarChart3, Check, ChevronRight, Flame, Trophy } from "lucide-react";

type Props = {
  totalStreakDays: number;
  doneToday: number;
  taskCount: number;
  verifiedDays: number;
  groupRank: number | null;
  bestStreak: number;
};

export default function StatRow({
  totalStreakDays,
  doneToday,
  taskCount,
  verifiedDays,
  groupRank,
  bestStreak,
}: Props) {
  const allDone = taskCount > 0 && doneToday === taskCount;

  return (
    <section className="stat-row" aria-label="Your numbers">
      <div className="stat-card">
        <span className="stat-icon stat-icon-flame">
          <Flame size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{totalStreakDays}</span>
          <span className="stat-label">Total streak days</span>
          <span className="stat-support">
            {totalStreakDays === 0 ? "Record your first day" : "Keep going!"}
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-done">
          <Check size={20} strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">
            {doneToday}/{taskCount}
          </span>
          <span className="stat-label">Tasks done today</span>
          <span className="stat-support">
            {allDone ? "Board's clear!" : doneToday === 0 ? "Nothing yet today" : "Great progress!"}
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-verified">
          <BarChart3 size={20} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{verifiedDays}</span>
          <span className="stat-label">Verified days</span>
          <span className="stat-support">
            {verifiedDays === 0 ? "Link a handle to verify" : "You're consistent!"}
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-icon stat-icon-rank">
          <Trophy size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{groupRank ? `#${groupRank}` : "—"}</span>
          <span className="stat-label">In your group</span>
          <span className="stat-support">
            {groupRank === null ? "Join one to rank" : groupRank === 1 ? "Top of the board!" : "Climbing up!"}
          </span>
        </div>
      </div>

      <Link to="/tasks" className="stat-card">
        <span className="stat-icon stat-icon-flame">
          <Flame size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{bestStreak} days</span>
          <span className="stat-label">Current streak</span>
          <span className="stat-support">
            {bestStreak === 0 ? "Start one today" : "Longest run yet!"}
          </span>
        </div>
        <span className="stat-go" aria-hidden="true">
          <ChevronRight size={16} strokeWidth={2.4} />
        </span>
      </Link>
    </section>
  );
}
