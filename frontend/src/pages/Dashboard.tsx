import { useCallback, useEffect, useState } from "react";
import { api, type Dashboard as DashboardData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Heatmap from "../components/Heatmap";
import TaskForm from "../components/TaskForm";
import TaskRow from "../components/TaskRow";

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

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard());
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

  async function handleCreate(title: string) {
    setError("");
    try {
      await api.createTask(title);
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

  if (!data) return <p className="muted">Loading your streaks…</p>;

  const bestStreak = data.tasks.reduce((max, task) => Math.max(max, task.currentStreak), 0);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Hey {user?.username} 👋</h1>
        <p className="muted">
          {data.tasks.length === 0
            ? "Add your first daily task below."
            : `Your best running streak is ${bestStreak} day${bestStreak === 1 ? "" : "s"}.`}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <TaskForm onCreate={handleCreate} />

      <Heatmap days={data.heatmap} today={data.today} />

      {data.tasks.length === 0 ? (
        <p className="muted empty">No tasks yet — a streak starts with day one.</p>
      ) : (
        <div className="stack">
          {data.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={data.today}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
