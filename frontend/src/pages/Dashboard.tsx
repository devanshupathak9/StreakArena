import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard as DashboardData, type SyncResult } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Heatmap from "../components/Heatmap";
import TaskForm from "../components/TaskForm";
import TaskRow from "../components/TaskRow";
import Toasts, { type Toast } from "../components/Toasts";

/** Flip one day locally so the tile responds instantly; the refetch confirms it. */
function applyToggle(data: DashboardData, taskId: string, date: string, done: boolean) {
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            doneToday: date === data.today ? done : task.doneToday,
            tiles: task.tiles.map((tile) => (tile.date === date ? { ...tile, done } : tile)),
          }
        : task,
    ),
    heatmap: data.heatmap.map((day) =>
      day.date === date ? { ...day, completed: day.completed + (done ? 1 : -1) } : day,
    ),
  };
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** One line per platform, so a partial failure still reports what did work. */
function describe(result: SyncResult) {
  if (!result.ok) return `${result.label}: ${result.error}`;
  if (result.added === 0) return `${result.label} is already up to date`;
  return `${result.label}: added ${result.added} day${result.added === 1 ? "" : "s"}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  function report(results: SyncResult[]) {
    setToasts((current) => [
      ...current,
      ...results.map((result, index) => ({
        id: Date.now() + index,
        ok: result.ok,
        text: describe(result),
      })),
    ]);
  }

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard(90));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(taskId: string, date: string, wasDone: boolean) {
    setError("");
    setData((current) => (current ? applyToggle(current, taskId, date, !wasDone) : current));
    try {
      await (wasDone ? api.uncomplete(taskId, date) : api.complete(taskId, date));
    } catch (err) {
      setError((err as Error).message);
    }
    // Streaks are the server's call, so resync either way.
    await load();
  }

  async function handleCreate(title: string, platform: string | null) {
    setError("");
    try {
      await api.createTask(title, platform);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleEdit(taskId: string, title: string, description: string) {
    setError("");
    try {
      await api.updateTask(taskId, { title, description });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(taskId: string) {
    const task = data?.tasks.find((t) => t.id === taskId);
    if (!window.confirm(`Delete "${task?.title}" and its whole history?`)) return;

    setError("");
    try {
      await api.deleteTask(taskId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSync(taskId: string | null) {
    setError("");
    setSyncing(taskId ?? "all");
    try {
      const response = taskId ? await api.syncTask(taskId) : await api.syncAll();
      if (response.results.length === 0) {
        setToasts((current) => [
          ...current,
          { id: Date.now(), ok: false, text: response.message ?? "Nothing to sync yet" },
        ]);
      } else {
        report(response.results);
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(null);
    }
  }

  if (!data) {
    return (
      <div className="stack">
        <div className="skeleton skeleton-row" style={{ height: 72 }} />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    );
  }

  const bestStreak = data.tasks.reduce((max, task) => Math.max(max, task.currentStreak), 0);
  const doneToday = data.tasks.filter((task) => task.doneToday).length;
  const verified = data.tasks.reduce((sum, task) => sum + task.syncedDays, 0);
  const syncable = data.tasks.some((task) => task.platform?.url);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {user?.username}
          </h1>
          <p className="muted">
            {data.tasks.length === 0
              ? "Add your first daily task to get started."
              : `${doneToday} of ${data.tasks.length} done today.`}
          </p>
        </div>

        {syncable && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void handleSync(null)}
            disabled={syncing !== null}
          >
            <span className={syncing === "all" ? "spin" : undefined} aria-hidden="true">
              ⟳
            </span>
            {syncing === "all" ? "Syncing…" : "Sync all"}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {data.tasks.length > 0 && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value stat-value-flame">🔥 {bestStreak}</span>
            <span className="stat-label">best running streak</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {doneToday} / {data.tasks.length}
            </span>
            <span className="stat-label">done today</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{verified}</span>
            <span className="stat-label">days verified by platforms</span>
          </div>
        </div>
      )}

      <Heatmap days={data.heatmap} today={data.today} />

      {data.tasks.length === 0 ? (
        <p className="empty">No tasks yet — a streak starts with day one.</p>
      ) : (
        <div className="stack">
          {data.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={data.today}
              syncing={syncing === task.id || syncing === "all"}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onSync={(id) => void handleSync(id)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <TaskForm onCreate={handleCreate} />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
