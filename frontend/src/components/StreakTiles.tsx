import type { Tile } from "../lib/api";
import { formatDay } from "../lib/dates";

type Props = {
  tiles: Tile[];
  today: string;
  /** Platform-backed tasks are filled by sync, so their history isn't hand-editable. */
  readOnly?: boolean;
  onToggle: (date: string, done: boolean) => void;
};

export default function StreakTiles({ tiles, today, readOnly = false, onToggle }: Props) {
  return (
    <div className="tiles">
      {tiles.map((tile) => {
        const className = `tile${tile.done ? " tile-done" : ""}${
          tile.date === today ? " tile-today" : ""
        }`;
        const label = `${formatDay(tile.date)} — ${tile.done ? "done" : "not done"}`;

        if (readOnly) {
          return <div key={tile.date} className={`${className} tile-static`} title={label} />;
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
          />
        );
      })}
    </div>
  );
}
