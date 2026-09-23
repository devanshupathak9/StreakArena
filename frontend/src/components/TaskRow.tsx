import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Check, MoreHorizontal, RefreshCw } from "lucide-react";
import type { TaskSummary } from "../lib/api";
import { weekDays } from "../lib/week";
import MonthTiles from "./MonthTiles";
import PlatformIcon from "./ui/PlatformIcon";
import WeekStrip from "./ui/WeekStrip";

type Props = {
  task: TaskSummary;
  today: string;
  syncing: boolean;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  onSync: (taskId: string) => void;
  onEdit: (taskId: string, title: string, description: string) => Promise<void>;
};

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

  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);

  const historyId = `task-history-${task.id}`;
  const week = weekDays(task.tiles, today);
  const doneThisWeek = week.filter((day) => day.done).length;

  useEffect(() => {
    if (!menu) return;
    function onDocument(event: MouseEvent) {
      if (!menuWrap.current?.contains(event.target as Node)) setMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDocument);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocument);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

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

  if (editing) {
    return (
      <article className="task-row task-row-editing">
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
          <div className="task-edit-actions">
            <button type="submit" className="button" disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="button button-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className={`task-row${open ? " task-row-open" : ""}`}>
      <div className="task-line">
        <div className="task-cell task-cell-name">
          <PlatformIcon platform={task.platform?.id ?? null} title={task.title} />
          <div className="task-identity">
            <h3 className="task-title">{task.title}</h3>
            <p className="task-source">
              {task.platform ? (
                task.platform.url ? (
                  <a href={task.platform.url} target="_blank" rel="noreferrer">
                    {task.platform.label}
                  </a>
                ) : (
                  <Link to="/profile">Link {task.platform.label}</Link>
                )
              ) : (
                "Manual"
              )}
            </p>
          </div>
        </div>

        <div className="task-cell task-cell-streak">
          <span className={task.currentStreak > 0 ? "streak-figure" : "streak-figure cold"}>
            <span className="flame-icon" aria-hidden="true">
              🔥
            </span>
            <span className="num">{task.currentStreak} days</span>
          </span>
        </div>

        <div className="task-cell task-cell-week">
          <WeekStrip tiles={task.tiles} today={today} />
        </div>

        <div className="task-cell task-cell-progress">
          <span className="progress-count num">{doneThisWeek}/7</span>
          <span className="bar">
            <span
              className="bar-fill"
              style={{ width: `${(doneThisWeek / 7) * 100}%` }}
              role="progressbar"
              aria-valuenow={doneThisWeek}
              aria-valuemin={0}
              aria-valuemax={7}
              aria-label={`${doneThisWeek} of 7 days this week`}
            />
          </span>
        </div>

        <div className="task-cell task-cell-actions">
          {canSync ? (
            <button
              type="button"
              className="button button-sm"
              onClick={() => onSync(task.id)}
              disabled={syncing}
              title={`Check ${task.platform?.label} for days you were active`}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.2}
                className={syncing ? "spin" : undefined}
                aria-hidden="true"
              />
              {syncing ? "Syncing…" : "Sync"}
            </button>
          ) : synced ? (
            <Link to="/profile" className="button button-sm button-ghost">
              Link handle
            </Link>
          ) : (
            <button
              type="button"
              className={task.doneToday ? "button button-sm button-done" : "button button-sm"}
              onClick={() => onToggle(task.id, today, task.doneToday)}
            >
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              {task.doneToday ? "Done today" : "Mark done"}
            </button>
          )}

          <div className="task-menu-wrap" ref={menuWrap}>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-haspopup="menu"
              aria-label={`More options for ${task.title}`}
            >
              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            </button>

            {menu && (
              <div className="account-menu task-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={open}
                  aria-controls={historyId}
                  onClick={() => {
                    setOpen(!open);
                    setMenu(false);
                  }}
                >
                  {open ? "Hide calendar" : "Show calendar"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTitle(task.title);
                    setDescription(task.description ?? "");
                    setEditing(true);
                    setMenu(false);
                  }}
                >
                  Edit task
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenu(false);
                    onDelete(task.id);
                  }}
                >
                  Delete task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="task-history" id={historyId}>
          {task.description && <p className="task-note">{task.description}</p>}
          <MonthTiles
            tiles={task.tiles}
            today={today}
            readOnly={synced}
            onToggle={(date, done) => onToggle(task.id, date, done)}
          />
        </div>
      )}
    </article>
  );
}
