import { Link } from "react-router-dom";
import type { TaskSummary } from "../lib/api";
import StreakTiles from "./StreakTiles";
import { formatWhen } from "../lib/dates";

type Props = {
  task: TaskSummary;
  today: string;
  syncing: boolean;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  onSync: (taskId: string) => void;
};

/** The platform tag: a live link once the handle is linked, a nudge before that. */
function PlatformBadge({ platform }: { platform: NonNullable<TaskSummary["platform"]> }) {
  if (!platform.url) {
    return (
      <Link className="badge badge-muted" to="/profile">
        <span aria-hidden="true">{platform.emoji}</span> Link {platform.label}
      </Link>
    );
  }
  return (
    <a
      className="badge"
      href={platform.url}
      target="_blank"
      rel="noreferrer"
      title={`Open ${platform.handle} on ${platform.label}`}
    >
      <span aria-hidden="true">{platform.emoji}</span> {platform.label} ↗
    </a>
  );
}

export default function TaskRow({ task, today, syncing, onToggle, onDelete, onSync }: Props) {
  // A platform-backed task is proved by its platform, so it has no manual control.
  // A plain task has no platform to ask, so ticking it by hand is the only way.
  const synced = Boolean(task.platform);
  const canSync = Boolean(task.platform?.url);

  return (
    <article className="task-row">
      <div className="task-head">
        <div>
          <h3 className="task-title">
            {task.title}
            {task.platform && <PlatformBadge platform={task.platform} />}
            {task.syncedDays > 0 && (
              <span
                className="badge badge-verified"
                title={`${task.syncedDays} days confirmed by ${task.platform?.label}`}
              >
                ✓ verified
              </span>
            )}
          </h3>

          <p className="task-meta">
            <span className={task.currentStreak > 0 ? "flame" : "flame flame-cold"}>
              🔥 {task.currentStreak} day{task.currentStreak === 1 ? "" : "s"}
            </span>
            <span className="dot">·</span>
            <span>best {task.longestStreak}</span>
            <span className="dot">·</span>
            <span>{task.totalDays} total</span>
            {task.platform?.lastSyncedAt && (
              <>
                <span className="dot">·</span>
                <span>synced {formatWhen(task.platform.lastSyncedAt)}</span>
              </>
            )}
          </p>
        </div>

        <div className="task-actions">
          {canSync && (
            <button
              type="button"
              className="button button-sm"
              onClick={() => onSync(task.id)}
              disabled={syncing}
              title={`Check ${task.platform?.label} for days you were active`}
            >
              <span className={syncing ? "spin" : undefined} aria-hidden="true">
                ⟳
              </span>
              {syncing ? "Syncing…" : "Sync"}
            </button>
          )}

          {!synced && (
            <button
              type="button"
              className={task.doneToday ? "button button-done" : "button"}
              onClick={() => onToggle(task.id, today, task.doneToday)}
            >
              {task.doneToday ? "✓ Done today" : "Mark done"}
            </button>
          )}

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
        readOnly={synced}
        onToggle={(date, done) => onToggle(task.id, date, done)}
      />

      {synced && !canSync && (
        <p className="muted small">
          Link your {task.platform?.label} handle in Profile and this fills itself in.
        </p>
      )}
    </article>
  );
}
