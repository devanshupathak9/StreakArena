import { useAppData } from "../context/AppData";
import { useTaskActions } from "../hooks/useTaskActions";
import ActivityFeed from "../components/ActivityFeed";
import Heatmap from "../components/Heatmap";
import Hero from "../components/Hero";
import QuoteTile from "../components/QuoteTile";
import StatRow from "../components/StatRow";
import TaskPanel from "../components/TaskPanel";
import TodayProgress from "../components/TodayProgress";
import Toasts from "../components/Toasts";

export default function Dashboard() {
  const { groups } = useAppData();
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
    handleReschedule,
  } = useTaskActions();

  if (!data) {
    return (
      <div className="dashboard">
        <div className="skeleton" style={{ height: 240, borderRadius: "var(--radius-lg)" }} />
        <div className="skeleton" style={{ height: 104, borderRadius: "var(--radius-lg)" }} />
        <div className="skeleton" style={{ height: 380, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  // Every headline number is about habits. One-off jobs have no streak and are left
  // out of the heatmap and the leaderboards server-side, so counting them here would
  // make the stat row disagree with everything else on the page.
  const habits = data.tasks.filter((task) => task.kind !== "once");

  const bestStreak = habits.reduce((max, task) => Math.max(max, task.currentStreak), 0);
  const totalStreakDays = habits.reduce((sum, task) => sum + task.totalDays, 0);
  const doneToday = habits.filter((task) => task.doneToday).length;
  const verified = habits.reduce((sum, task) => sum + task.syncedDays, 0);

  // Your best placing across the groups you're in — the one worth showing.
  const ranks = (groups ?? []).map((group) => group.yourRank).filter((r): r is number => r !== null);
  const groupRank = ranks.length > 0 ? Math.min(...ranks) : null;

  return (
    <div className="dashboard">
      <Hero today={data.today} />

      <StatRow
        totalStreakDays={totalStreakDays}
        doneToday={doneToday}
        taskCount={habits.length}
        verifiedDays={verified}
        groupRank={groupRank}
        bestStreak={bestStreak}
      />

      {error && <p className="error">{error}</p>}

      {/* "How consistent have I been?" and "what did I do today?" answer together,
          so the two cards are one row and share a height. */}
      <section className="analytics-row">
        <Heatmap days={data.heatmap} today={data.today} />
        {habits.length > 0 && <TodayProgress tasks={habits} />}
      </section>

      {/* A wider gap here: this is where the page turns from "how am I doing?"
          to "what do I do now?". */}
      <section className="tasks-row">
        <TaskPanel
          heading="Your active tasks"
          tasks={data.tasks}
          today={data.today}
          syncing={syncing}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onSync={(id) => void handleSync(id)}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onReschedule={handleReschedule}
        />

        <ActivityFeed recent={data.recent} groups={groups} bestStreak={bestStreak} />
      </section>

      {/* Below everything, where it can't interrupt the hierarchy. */}
      <QuoteTile />

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
