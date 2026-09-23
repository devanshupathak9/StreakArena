import { useState, type CSSProperties } from "react";
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

/** Month letters sit over the column where that month's first day lands. */
function monthMarks(days: HeatmapDay[], leadingPad: number) {
  const marks: { key: string; label: string; column: number }[] = [];
  let previous = "";
  days.forEach((day, index) => {
    const month = day.date.slice(0, 7);
    if (month === previous) return;
    previous = month;
    const column = Math.floor((index + leadingPad) / 7) + 1;
    if (marks.length > 0 && column - marks[marks.length - 1].column < 3) return;
    marks.push({
      key: month,
      label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        timeZone: "UTC",
      }),
      column,
    });
  });
  return marks;
}

const RANGES = [30, 90, 180] as const;

export default function Heatmap({ days, today }: { days: HeatmapDay[]; today: string }) {
  const [range, setRange] = useState<number>(90);
  if (days.length === 0) return null;

  const shown = days.slice(Math.max(0, days.length - range));
  const pad = weekdayIndex(shown[0].date);
  const cells: (HeatmapDay | null)[] = [...Array<null>(pad).fill(null), ...shown];
  const marks = monthMarks(shown, pad);
  const columns = Math.ceil(cells.length / 7);

  return (
    <section className="card heatmap-card">
      <div className="card-head">
        <div>
          <h2>Activity heatmap</h2>
          <p className="muted small">Your consistency over the last {range} days.</p>
        </div>
        <select
          className="select-sm"
          value={range}
          onChange={(event) => setRange(Number(event.target.value))}
          aria-label="Heatmap range"
        >
          {RANGES.map((option) => (
            <option key={option} value={option}>
              Last {option} days
            </option>
          ))}
        </select>
      </div>

      {/* Months, weekday labels and cells share one grid, so a month letter stays
          over its own column however wide the cells end up. */}
      <div
        className="heatmap-wrap"
        style={{ "--cols": columns } as CSSProperties}
      >
        <div className="heatmap-months" aria-hidden="true">
          {marks.map((mark) => (
            <span key={mark.key} style={{ gridColumn: mark.column }}>
              {mark.label}
            </span>
          ))}
        </div>

        <div className="heatmap-weekdays" aria-hidden="true">
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

      <div className="heatmap-legend">
        <span className="muted small">Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className={`cell cell-${n}`} />
        ))}
        <span className="muted small">More</span>
      </div>
    </section>
  );
}
