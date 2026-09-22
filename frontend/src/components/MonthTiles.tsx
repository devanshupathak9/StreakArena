import { useMemo, useState } from "react";
import type { Tile } from "../lib/api";
import { formatDay } from "../lib/dates";

type Props = {
  tiles: Tile[];
  today: string;
  readOnly?: boolean;
  onToggle: (date: string, done: boolean) => void;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthLabel(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Sunday-first column index, read as UTC so the browser's offset can't shift it. */
function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * A task's history as a calendar month rather than a running strip — the same days,
 * but you can see "every Tuesday" instead of a wall of squares. Months come from the
 * tiles themselves, so the arrows only reach as far back as there is data.
 */
export default function MonthTiles({ tiles, today, readOnly = false, onToggle }: Props) {
  const months = useMemo(() => {
    const grouped = new Map<string, Tile[]>();
    for (const tile of tiles) {
      const key = tile.date.slice(0, 7);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tile);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tiles]);

  // Start on the most recent month; the arrows walk backwards from there.
  const [index, setIndex] = useState(Math.max(months.length - 1, 0));
  if (months.length === 0) return null;

  const safeIndex = Math.min(index, months.length - 1);
  const [key, days] = months[safeIndex];
  const doneCount = days.filter((day) => day.done).length;

  // Pad so the first day lands under its weekday.
  const pad = Array.from({ length: weekday(days[0].date) });

  return (
    <div className="month">
      <div className="month-head">
        <button
          type="button"
          className="month-arrow"
          onClick={() => setIndex(safeIndex - 1)}
          disabled={safeIndex === 0}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="month-title">{monthLabel(key)}</span>
        <button
          type="button"
          className="month-arrow"
          onClick={() => setIndex(safeIndex + 1)}
          disabled={safeIndex === months.length - 1}
          aria-label="Next month"
        >
          ›
        </button>
        <span className="muted small month-count">
          {doneCount}/{days.length} days
        </span>
      </div>

      <div className="month-grid" role="grid" aria-label={`${monthLabel(key)} activity`}>
        {WEEKDAYS.map((label, i) => (
          <span key={i} className="month-weekday" aria-hidden="true">
            {label}
          </span>
        ))}

        {pad.map((_, i) => (
          <span key={`pad-${i}`} className="month-pad" />
        ))}

        {days.map((tile) => {
          const state = tile.done ? (tile.verified ? " tile-verified" : " tile-self") : "";
          const className = `tile month-day${state}${tile.date === today ? " tile-today" : ""}`;
          const number = Number(tile.date.slice(8));
          // Spelled out for screen readers: the source matters as much as the tick.
          const label = `${formatDay(tile.date)}: ${
            tile.done ? (tile.verified ? "verified" : "self-reported") : "nothing recorded"
          }`;

          if (readOnly) {
            return (
              <span
                key={tile.date}
                className={`${className} tile-static`}
                role="gridcell"
                aria-label={label}
                title={label}
              >
                {number}
              </span>
            );
          }
          return (
            <button
              key={tile.date}
              type="button"
              className={className}
              title={label}
              aria-pressed={tile.done}
              aria-label={label}
              onClick={() => onToggle(tile.date, tile.done)}
            >
              {number}
            </button>
          );
        })}
      </div>
    </div>
  );
}
