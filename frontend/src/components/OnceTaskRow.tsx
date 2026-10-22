import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, MoreHorizontal, RefreshCw } from "lucide-react";
import type { TaskSummary } from "../lib/api";
import { relativeDay } from "../lib/dates";
import PlatformIcon from "./ui/PlatformIcon";
import TaskActivity from "./TaskActivity";

type Props = {
  task: TaskSummary;
  today: string;
  syncing: boolean;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  onSync: (taskId: string) => void;
  onEdit: (taskId: string, title: string, description: string) => Promise<void>;
  onReschedule: (taskId: string, dueDate: string) => Promise<void>;
};

/** Tomorrow, as a bare date in the same timezone the API already speaks. */
function tomorrow(today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * A one-off task: a single job on a single day. No streak, no week strip, no
 * progress bar — those all answer "how consistently?", which is the wrong question
 * for something you only ever do once. What it shows instead is when it's due and
 * whether it's been done.
 */
export default function OnceTaskRow({
  task,
  today,
  syncing,
  onToggle,
  onDelete,
  onSync,
  onEdit,
  onReschedule,
}: Props) {
  // Same rule as a habit: a platform-backed task is proved by its platform, so it
  // has no manual control. A plain one has nothing to ask, so ticking is the way.
  const synced = Boolean(task.platform);
  const canSync = Boolean(task.platform?.url);
  const action = task.platform?.action ?? null;

  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);

  const detailId = `task-detail-${task.id}`;

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
          {/* The date applies the moment it changes, unlike the two fields above —
              rescheduling is its own action, not part of renaming. The hint says so
              rather than leaving the Save button looking like it covers this too. */}
          <label className="once-due-field">
            Due date <span className="muted small">saves straight away</span>
            <input
              type="date"
              value={task.dueDate ?? today}
              onChange={(event) => void onReschedule(task.id, event.target.value)}
            />
          </label>
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
    <article
      className={`task-row once-row${task.done ? " once-done" : ""}${
        task.overdue ? " once-overdue" : ""
      }${open ? " task-row-open" : ""}`}
    >
      <div className="once-line">
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

        <div className="task-cell once-when">
          {task.done ? (
            <span className="once-badge once-badge-done">
              <Check size={13} strokeWidth={3} aria-hidden="true" />
              Done
            </span>
          ) : task.overdue ? (
            <span className="once-badge once-badge-late">
              <AlertCircle size={13} strokeWidth={2.4} aria-hidden="true" />
              {task.dueDate ? relativeDay(task.dueDate, today) : "Overdue"}
            </span>
          ) : (
            <span className="once-badge">
              {task.dueDate ? relativeDay(task.dueDate, today) : "No date"}
            </span>
          )}
        </div>

        <div className="task-cell task-cell-actions">
          {/* The nudge only makes sense while it's still outstanding. */}
          {!task.done && action && (
            <a
              href={action.url}
              target="_blank"
              rel="noreferrer"
              className="button button-sm button-ghost"
            >
              {action.label}
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </a>
          )}

          {canSync ? (
            <button
              type="button"
              className="button button-sm"
              onClick={() => onSync(task.id)}
              disabled={syncing}
              title={`Check ${task.platform?.label} for activity`}
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
              className={task.done ? "button button-sm button-done" : "button button-sm"}
              onClick={() => onToggle(task.id, task.dueDate ?? today, task.done)}
            >
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              {task.done ? "Done" : "Mark done"}
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
                {(task.description || task.platform?.hasDetail) && (
                  <button
                    type="button"
                    role="menuitem"
                    aria-expanded={open}
                    aria-controls={detailId}
                    onClick={() => {
                      setOpen(!open);
                      setMenu(false);
                    }}
                  >
                    {open ? "Hide details" : "Show details"}
                  </button>
                )}
                {!task.done && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      void onReschedule(task.id, tomorrow(today));
                    }}
                  >
                    Move to tomorrow
                  </button>
                )}
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
        <div className="task-history" id={detailId}>
          {task.description && <p className="task-note">{task.description}</p>}
          {task.platform?.hasDetail && (
            <TaskActivity taskId={task.id} label={task.platform.label} />
          )}
        </div>
      )}
    </article>
  );
}
