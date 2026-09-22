import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { useAppData } from "../../context/AppData";

/** After this hour in the user's own timezone, an unfinished day is a warning. */
const EVENING_HOUR = 20;

function isEvening(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: timezone }).format(
      new Date(),
    ),
  );
  return hour >= EVENING_HOUR;
}

/**
 * The one place the sidebar is allowed to be loud: is today's streak safe? It answers
 * that without the user opening the dashboard.
 */
export default function TodayBlock({ collapsed }: { collapsed: boolean }) {
  const { dashboard } = useAppData();
  if (!dashboard || dashboard.tasks.length === 0) return null;

  const total = dashboard.tasks.length;
  const done = dashboard.tasks.filter((task) => task.doneToday).length;
  const streak = dashboard.tasks.reduce((max, task) => Math.max(max, task.currentStreak), 0);
  const left = total - done;
  const urgent = left > 0 && isEvening(dashboard.timezone);

  const summary =
    left === 0
      ? "All done today"
      : urgent
        ? `${left} task${left === 1 ? "" : "s"} left. Streak ends at midnight.`
        : `${done} of ${total} done`;

  return (
    <Link
      to="/"
      className={`today-block${urgent ? " today-urgent" : ""}`}
      title={collapsed ? `${streak} day streak — ${summary}` : undefined}
    >
      <span className="today-streak">
        <Flame size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="today-count" key={streak}>
          {streak}
        </span>
      </span>

      <span className="today-detail">
        <span className="today-summary">{summary}</span>
        <span
          className="today-bar"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Tasks done today"
        >
          <span className="today-bar-fill" style={{ width: `${(done / total) * 100}%` }} />
        </span>
      </span>
    </Link>
  );
}
