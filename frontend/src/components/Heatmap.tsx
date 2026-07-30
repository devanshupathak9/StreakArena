import type { HeatmapDay } from "../lib/api";
import { formatDay, weekdayIndex } from "../lib/dates";

/** 0 = nothing done, 4 = everything done. */
function level(day: HeatmapDay) {
  if (day.total === 0 || day.completed === 0) return 0;
  const ratio = day.completed / day.total;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

export default function Heatmap({ days, today }: { days: HeatmapDay[]; today: string }) {
  if (days.length === 0) return null;

  // Pad the first column so each row is a consistent weekday.
  const cells: (HeatmapDay | null)[] = [
    ...Array<null>(weekdayIndex(days[0].date)).fill(null),
    ...days,
  ];
  const activeDays = days.filter((day) => day.completed > 0).length;

  return (
    <section className="card heatmap-card">
      <div className="card-head">
        <h2>Last 90 days</h2>
        <p className="muted">{activeDays} active days</p>
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
                title={`${formatDay(day.date)} — ${day.completed}/${day.total} tasks`}
              />
            ) : (
              <div key={`pad-${index}`} className="cell cell-empty" />
            ),
          )}
        </div>
      </div>

      <div className="heatmap-legend">
        <span className="muted">Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className={`cell cell-${n}`} />
        ))}
        <span className="muted">More</span>
      </div>
    </section>
  );
}
