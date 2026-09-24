import { useState } from "react";
import { ChevronRight, Plus, RefreshCw, Users } from "lucide-react";
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

/** Your own tasks first, then one bucket per group that put tasks on your board. */
function split(tasks: TaskSummary[]) {
  const personal: TaskSummary[] = [];
  const groups = new Map<string, { name: string; tasks: TaskSummary[] }>();

  for (const task of tasks) {
    if (!task.group) {
      personal.push(task);
      continue;
    }
    const bucket = groups.get(task.group.id) ?? { name: task.group.name, tasks: [] };
    bucket.tasks.push(task);
    groups.set(task.group.id, bucket);
  }

  return { personal, groups: [...groups.entries()] };
}

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
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const counts = new Map<Category, number>();
  for (const task of tasks) {
    const category = categoryOf(task);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const shown = filter === "all" ? tasks : tasks.filter((task) => categoryOf(task) === filter);
  const { personal, groups } = split(shown);
  const syncable = tasks.some((task) => task.platform?.url);

  async function handleCreate(title: string, platform: string | null) {
    await onCreate(title, platform);
    setComposing(false);
  }

  function rows(list: TaskSummary[]) {
    return (
      <div className="task-list">
        {list.map((task) => (
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
    );
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

          {personal.length > 0 && rows(personal)}

          {groups.map(([id, group]) => {
            const expanded = open[id] ?? false;
            const done = group.tasks.filter((task) => task.doneToday).length;
            return (
              <div key={id} className="task-group">
                <button
                  type="button"
                  className="task-group-head"
                  onClick={() => setOpen((current) => ({ ...current, [id]: !expanded }))}
                  aria-expanded={expanded}
                  aria-controls={`group-tasks-${id}`}
                >
                  <ChevronRight
                    size={16}
                    strokeWidth={2.2}
                    className={expanded ? "chevron-open" : undefined}
                    aria-hidden="true"
                  />
                  <Users size={15} strokeWidth={2} aria-hidden="true" />
                  <span className="task-group-name">{group.name}</span>
                  <span className="task-group-count num">
                    {done}/{group.tasks.length} done today
                  </span>
                </button>

                {expanded && <div id={`group-tasks-${id}`}>{rows(group.tasks)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
