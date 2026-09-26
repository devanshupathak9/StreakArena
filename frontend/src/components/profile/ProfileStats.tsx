import { Link } from "react-router-dom";
import { BarChart3, Flame, Star, Trophy, Users } from "lucide-react";

type Props = {
  streakDays: number;
  tasksCompleted: number;
  globalRank: number | null;
  activeGroups: number;
  achievements: number;
};

export default function ProfileStats({
  streakDays,
  tasksCompleted,
  globalRank,
  activeGroups,
  achievements,
}: Props) {
  return (
    <section className="stat-row" aria-label="Your numbers">
      <Link to="/tasks" className="stat-card">
        <span className="stat-icon stat-icon-flame">
          <Flame size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{streakDays}</span>
          <span className="stat-label">Total streak days</span>
          <span className="stat-support">
            {streakDays === 0 ? "Record your first day" : "Keep going!"}
          </span>
        </div>
      </Link>

      <Link to="/tasks" className="stat-card">
        <span className="stat-icon stat-icon-verified">
          <BarChart3 size={20} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{tasksCompleted}</span>
          <span className="stat-label">Days completed</span>
          <span className="stat-support">
            {tasksCompleted === 0 ? "Nothing logged yet" : "Great progress!"}
          </span>
        </div>
      </Link>

      <Link to="/leaderboard" className="stat-card">
        <span className="stat-icon stat-icon-rank">
          <Trophy size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{globalRank ? `#${globalRank}` : "—"}</span>
          <span className="stat-label">Global rank</span>
          <span className="stat-support">
            {globalRank === null
              ? "Log a day to rank"
              : globalRank <= 3
                ? "Top of the board!"
                : "Climbing up!"}
          </span>
        </div>
      </Link>

      <Link to="/groups" className="stat-card">
        <span className="stat-icon stat-icon-groups">
          <Users size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{activeGroups}</span>
          <span className="stat-label">Active groups</span>
          <span className="stat-support">
            {activeGroups === 0 ? "Join or start one" : "Stay connected!"}
          </span>
        </div>
      </Link>

      <div className="stat-card">
        <span className="stat-icon stat-icon-gold">
          <Star size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="stat-body">
          <span className="stat-value num">{achievements}</span>
          <span className="stat-label">Achievements</span>
          <span className="stat-support">
            {achievements === 0 ? "None yet" : "Well done!"}
          </span>
        </div>
      </div>
    </section>
  );
}
