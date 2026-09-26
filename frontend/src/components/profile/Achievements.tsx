import { Code2, Flame, Star, Trophy } from "lucide-react";
import type { Achievement } from "../../lib/achievements";

const ICONS = {
  streaker: Flame,
  "code-warrior": Code2,
  "top-three": Trophy,
  "multi-tasker": Star,
} as const;

export default function Achievements({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Achievements</h2>
          <p className="muted small">
            {earned} of {achievements.length} earned
          </p>
        </div>
      </div>

      <div className="badge-grid">
        {achievements.map((achievement) => {
          const Icon = ICONS[achievement.id as keyof typeof ICONS] ?? Star;
          return (
            <div
              key={achievement.id}
              className={`badge-tile badge-${achievement.tone}${
                achievement.earned ? " is-earned" : ""
              }`}
              title={
                achievement.earned
                  ? `Earned: ${achievement.requirement}`
                  : `Locked: ${achievement.requirement}`
              }
            >
              <span className="badge-medal" aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <span className="badge-title">{achievement.title}</span>
              <span className="badge-subtitle">{achievement.subtitle}</span>
              <span className="visually-hidden">
                {achievement.earned ? "Earned." : "Not earned yet."} {achievement.requirement}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
