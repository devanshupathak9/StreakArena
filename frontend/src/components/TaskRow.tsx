import type { TaskSummary } from "../lib/api";
import StreakTiles from "./StreakTiles";

type Props = {
  task: TaskSummary;
  today: string;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
};

export default function TaskRow({ task, today, onToggle, onDelete }: Props) {
  return (
    <article className="task-row">
      <div className="task-head">
        <div>
          <h3 className="task-title">{task.title}</h3>
          <p className="task-meta">
            <span className={task.currentStreak > 0 ? "flame" : "flame flame-cold"}>
              🔥 {task.currentStreak} day{task.currentStreak === 1 ? "" : "s"}
            </span>
            <span className="dot">·</span>
            best {task.longestStreak}
            <span className="dot">·</span>
            {task.totalDays} total
          </p>
        </div>

        <div className="task-actions">
          <button
            type="button"
            className={task.doneToday ? "button button-done" : "button"}
            onClick={() => onToggle(task.id, today, task.doneToday)}
          >
            {task.doneToday ? "✓ Done today" : "Mark done"}
          </button>
          <button
            type="button"
            className="link-button danger"
            onClick={() => onDelete(task.id)}
            aria-label={`Delete ${task.title}`}
          >
            Delete
          </button>
        </div>
      </div>

      <StreakTiles
        tiles={task.tiles}
        today={today}
        onToggle={(date, done) => onToggle(task.id, date, done)}
      />
    </article>
  );
}
