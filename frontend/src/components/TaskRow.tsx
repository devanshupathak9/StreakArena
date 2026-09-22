import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { TaskSummary } from "../lib/api";
import MonthTiles from "./MonthTiles";
import { formatWhen } from "../lib/dates";

type Props = {
  task: TaskSummary;
  today: string;
  syncing: boolean;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  onSync: (taskId: string) => void;
  onEdit: (taskId: string, title: string, description: string) => Promise<void>;
};

/** The platform tag: a live link once the handle is linked, a nudge before that. */
function PlatformBadge({ platform }: { platform: NonNullable<TaskSummary["platform"]> }) {
  if (!platform.url) {
    return (
      <Link className="badge badge-muted" to="/profile">
Link {platform.label}
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
{platform.label}
    </a>
  );
}

export default function TaskRow({
  task,
  today,
  syncing,
  onToggle,
  onDelete,
  onSync,
  onEdit,
}: Props) {
  // A platform-backed task is proved by its platform, so it has no manual control.
  // A plain task has no platform to ask, so ticking it by hand is the only way.
  const synced = Boolean(task.platform);
  const canSync = Boolean(task.platform?.url);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setEditing(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      await onEdit(task.id, title.trim(), description.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="task-row">
      <div className="task-head">
        <div className="task-identity">
          {editing ? (
            <form className="task-edit" onSubmit={handleSave}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                aria-label="Task name"
                autoFocus
              />
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a note — what counts as done?"
                maxLength={200}
                aria-label="Task description"
              />
              <div className="task-actions">
                <button type="submit" className="button button-sm" disabled={saving || !title.trim()}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="link-button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="task-title">
                {task.title}
                {task.platform && <PlatformBadge platform={task.platform} />}
                {task.syncedDays > 0 ? (
                  <span
                    className="badge badge-verified"
                    title={`${task.syncedDays} days confirmed by ${task.platform?.label}`}
                  >
                    ✓ Verified
                  </span>
                ) : (
                  !task.platform && <span className="badge badge-self">Self-reported</span>
                )}
              </h3>

              {task.description && <p className="task-note">{task.description}</p>}

              <p className="task-meta">
                <span className={task.currentStreak > 0 ? "flame num" : "flame flame-cold num"}>
                  {task.currentStreak} day{task.currentStreak === 1 ? "" : "s"} running
                </span>
                {task.platform?.lastSyncedAt && (
                  <span className="task-synced">
                    synced {formatWhen(task.platform.lastSyncedAt)}
                  </span>
                )}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="task-actions">
            {canSync && (
              <button
                type="button"
                className="button button-sm"
                onClick={() => onSync(task.id)}
                disabled={syncing}
                title={`Check ${task.platform?.label} for days you were active`}
              >
  {syncing ? "Syncing…" : `Sync ${task.platform?.label ?? ""}`}
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

            <button type="button" className="link-button" onClick={startEditing}>
              Edit
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
        )}
      </div>

      <MonthTiles
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
