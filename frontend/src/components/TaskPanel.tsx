import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { TaskSummary } from "../lib/api";
import { CATEGORY_LABELS, categoryOf, type Category } from "../lib/categories";
import PillTabs from "./ui/PillTabs";
import TaskForm from "./TaskForm";
import TaskRow from "./TaskRow";

type Filter = "all" | Category;

type Props = {
  tasks: TaskSummary[];
  today: string;
  syncing: string | null;
  heading: string;
  onToggle: (taskId: string, date: string, done: boolean) => void;
  onDelete: (taskId: string) => void;
  onSync: (taskId: string | null) => void;
  onEdit: (taskId: string, title: string, description: string) => Promise<void>;
  onCreate: (title: string, platform: string | null) => Promise<void>;
};

const ORDER: Category[] = ["coding", "learning", "health", "other"];

export default function TaskPanel({
  tasks,
  today,
  syncing,
  heading,
  onToggle,
  onDelete,
  onSync,
  onEdit,
  onCreate,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [composing, setComposing] = useState(false);

  const counts = new Map<Category, number>();
  for (const task of tasks) {
    const category = categoryOf(task);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const shown = filter === "all" ? tasks : tasks.filter((task) => categoryOf(task) === filter);
  const syncable = tasks.some((task) => task.platform?.url);

  async function handleCreate(title: string, platform: string | null) {
    await onCreate(title, platform);
    setComposing(false);
  }

  return (
    <section className="card task-panel">
      <div className="card-head">
        <h2>{heading}</h2>
        <div className="head-actions">
          {syncable && (
            <button
              type="button"
              className="button button-sm button-ghost"
              onClick={() => onSync(null)}
              disabled={syncing !== null}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.2}
                className={syncing === "all" ? "spin" : undefined}
                aria-hidden="true"
              />
              {syncing === "all" ? "Syncing…" : "Sync all"}
            </button>
          )}
          <button type="button" className="button button-sm" onClick={() => setComposing(!composing)}>
            <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
            Add task
          </button>
        </div>
      </div>

      <PillTabs
        label="Filter tasks"
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: "all" as Filter, label: "All", count: tasks.length },
          ...ORDER.filter((category) => (counts.get(category) ?? 0) > 0).map((category) => ({
            id: category as Filter,
            label: CATEGORY_LABELS[category],
            count: counts.get(category) ?? 0,
          })),
        ]}
      />

      {composing && <TaskForm onCreate={handleCreate} onCancel={() => setComposing(false)} />}

      {shown.length === 0 ? (
        <p className="empty">
          {tasks.length === 0
            ? "Nothing tracked yet. Add a task — tag it with a platform and it proves itself."
            : "No task in this group yet."}
        </p>
      ) : (
        <div className="task-table">
          <div className="task-head-row" aria-hidden="true">
            <span>Task</span>
            <span>Streak</span>
            <span>This week</span>
            <span>Progress</span>
            <span>Actions</span>
          </div>

          <div className="task-list">
            {shown.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                syncing={syncing === task.id || syncing === "all"}
                onToggle={onToggle}
                onDelete={onDelete}
                onSync={onSync}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
