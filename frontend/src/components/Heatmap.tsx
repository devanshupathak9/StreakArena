import type { HeatmapDay } from "../lib/api";
import { formatDay, weekdayIndex } from "../lib/dates";

/**
 * Intensity by how much you did that day, the way a contribution graph reads:
 * more completions, darker square. A day where everything was done is always the
 * darkest step, so a perfect day looks perfect whether you keep one task or six.
 */
function level(day: HeatmapDay) {
  if (day.completed === 0) return 0;
  if (day.total > 0 && day.completed >= day.total) return 4;
  if (day.completed >= 3) return 3;
  if (day.completed === 2) return 2;
  return 1;
}

function summary(day: HeatmapDay) {
  const label = day.completed === 1 ? "1 task" : `${day.completed} tasks`;
  return `${formatDay(day.date)} — ${day.completed === 0 ? "nothing" : label} of ${day.total}`;
}

export default function Heatmap({ days, today }: { days: HeatmapDay[]; today: string }) {
  if (days.length === 0) return null;

  // Pad the first column so each row is a consistent weekday.
  const cells: (HeatmapDay | null)[] = [
    ...Array<null>(weekdayIndex(days[0].date)).fill(null),
    ...days,
  ];

  const activeDays = days.filter((day) => day.completed > 0).length;
  const perfectDays = days.filter((day) => day.total > 0 && day.completed >= day.total).length;

  return (
    <section className="card heatmap-card">
      <div className="card-head">
        <div>
          <h2>Last 90 days</h2>
          <p className="muted small">
            {activeDays} active · {perfectDays} perfect
          </p>
        </div>

        <div className="heatmap-legend">
          <span className="muted small">Less</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className={`cell cell-${n}`} />
          ))}
          <span className="muted small">More</span>
        </div>
      </div>

      <div className="heatmap-wrap">
        <div className="heatmap-weekdays">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>

        <div className="heatmap">
          {cells.map((day, index) =>
            day ? (
              <div
                key={day.date}
                className={`cell cell-${level(day)}${day.date === today ? " cell-today" : ""}`}
                title={summary(day)}
              />
            ) : (
              <div key={`pad-${index}`} className="cell cell-empty" />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
