import type { TaskSummary } from "../lib/api";

type Props = {
  tasks: TaskSummary[];
  syncing: string | null;
  onToggle: (taskId: string, done: boolean) => void;
  onSync: (taskId: string) => void;
};

/**
 * The dashboard's one job, for a student checking at 11pm whether their streak is
 * safe: what is still outstanding today, and the button that settles it.
 */
export default function OwedToday({ tasks, syncing, onToggle, onSync }: Props) {
  const owed = tasks.filter((task) => !task.doneToday);

  if (tasks.length === 0) return null;

  if (owed.length === 0) {
    return (
      <section className="owed owed-clear">
        <p className="owed-clear-text">
          Everything done today. {tasks.length} task{tasks.length === 1 ? "" : "s"} settled.
        </p>
      </section>
    );
  }

  // A streak that's already running and unmarked is the one thing worth warning about.
  const atRisk = owed.filter((task) => task.currentStreak > 0);

  return (
    <section className="owed">
      <h2 className="owed-title">
        Still owed today
        {atRisk.length > 0 && (
          <span className="owed-risk">
            {atRisk.length === 1
              ? `Your ${atRisk[0].currentStreak}-day streak on ${atRisk[0].title} ends at midnight`
              : `${atRisk.length} running streaks end at midnight`}
          </span>
        )}
      </h2>

      <ul className="owed-list">
        {owed.map((task) => (
          <li key={task.id} className={task.currentStreak > 0 ? "owed-row at-risk" : "owed-row"}>
            <span className="owed-name">{task.title}</span>

            <span className="owed-streak num">
              {task.currentStreak > 0 ? `${task.currentStreak}-day streak` : "no streak yet"}
            </span>

            {task.platform ? (
              task.platform.url ? (
                <button
                  type="button"
                  className="button button-sm"
                  onClick={() => onSync(task.id)}
                  disabled={syncing !== null}
                >
                  {syncing === task.id || syncing === "all"
                    ? "Syncing…"
                    : `Sync ${task.platform.label}`}
                </button>
              ) : (
                <span className="owed-blocked">Link {task.platform.label} to verify</span>
              )
            ) : (
              <button
                type="button"
                className="button button-sm"
                onClick={() => onToggle(task.id, task.doneToday)}
              >
                Mark done
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
