import { useTaskActions } from "../hooks/useTaskActions";
import TaskPanel from "../components/TaskPanel";
import Toasts from "../components/Toasts";

/** The whole list, with room for the month calendars the dashboard keeps folded. */
export default function Tasks() {
  const {
    dashboard: data,
    error,
    syncing,
    toasts,
    dismiss,
    handleToggle,
    handleCreate,
    handleEdit,
    handleDelete,
    handleSync,
  } = useTaskActions();

  if (!data) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="muted">Everything you are keeping alive, and the days behind each one.</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <TaskPanel
        heading="All tasks"
        tasks={data.tasks}
        today={data.today}
        syncing={syncing}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onSync={(id) => void handleSync(id)}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
