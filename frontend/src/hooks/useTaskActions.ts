import { useCallback, useState } from "react";
import { api, type Dashboard as DashboardData, type SyncResult } from "../lib/api";
import { useAppData } from "../context/AppData";
import type { Toast } from "../components/Toasts";

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

/** One line per platform, so a partial failure still reports what did work. */
function describe(result: SyncResult) {
  if (!result.ok) return `${result.label} didn't sync. ${result.error}`;
  if (result.added === 0) return `${result.label} is already up to date`;
  return `Synced ${result.added} day${result.added === 1 ? "" : "s"} from ${result.label}`;
}

/**
 * Everything the dashboard and the tasks page both do to a task. Shared so the two
 * pages can't drift into treating the same action differently.
 */
export function useTaskActions() {
  const { dashboard, reloadDashboard, reloadGroups, setDashboard } = useAppData();
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const load = useCallback(async () => {
    try {
      // Group ranks and the account card move with the same actions.
      await Promise.all([reloadDashboard(), reloadGroups()]);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [reloadDashboard, reloadGroups]);

  async function handleToggle(taskId: string, date: string, wasDone: boolean) {
    setError("");
    setDashboard((current) => applyToggle(current, taskId, date, !wasDone));
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
    const task = dashboard?.tasks.find((t) => t.id === taskId);
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
        setToasts((current) => [
          ...current,
          ...response.results.map((result, index) => ({
            id: Date.now() + index,
            ok: result.ok,
            text: describe(result),
          })),
        ]);
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(null);
    }
  }

  return {
    dashboard,
    error,
    syncing,
    toasts,
    dismiss,
    handleToggle,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSync,
  };
}
