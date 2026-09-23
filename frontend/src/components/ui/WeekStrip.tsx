import { weekDays } from "../../lib/week";
import type { Tile } from "../../lib/api";
import { formatDay } from "../../lib/dates";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** The last seven days, Monday first, under their weekday letters. */
export default function WeekStrip({ tiles, today }: { tiles: Tile[]; today: string }) {
  const days = weekDays(tiles, today);

  return (
    <div className="week-strip">
      <div className="week-letters" aria-hidden="true">
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            className={days[i].isToday ? "week-letter week-letter-today" : "week-letter"}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="week-cells">
        {days.map((day) => {
          const state = day.done ? (day.verified ? " week-cell-verified" : " week-cell-self") : "";
          const label = day.future
            ? `${formatDay(day.key)}: still to come`
            : `${formatDay(day.key)}: ${
                day.done ? (day.verified ? "verified" : "self-reported") : "nothing recorded"
              }`;
          return (
            <span
              key={day.key}
              className={`week-cell${state}${day.future ? " week-cell-future" : ""}${
                day.isToday ? " week-cell-today" : ""
              }`}
              title={label}
              aria-label={label}
              role="img"
            />
          );
        })}
      </div>
    </div>
  );
}
