import type { Tile } from "../lib/api";
import { formatDay } from "../lib/dates";

type Props = {
  tiles: Tile[];
  today: string;
  onToggle: (date: string, done: boolean) => void;
};

export default function StreakTiles({ tiles, today, onToggle }: Props) {
  return (
    <div className="tiles">
      {tiles.map((tile) => (
        <button
          key={tile.date}
          type="button"
          className={`tile${tile.done ? " tile-done" : ""}${tile.date === today ? " tile-today" : ""}`}
          title={`${formatDay(tile.date)} — ${tile.done ? "done" : "not done"}`}
          aria-pressed={tile.done}
          aria-label={`${formatDay(tile.date)}, ${tile.done ? "done" : "not done"}`}
          onClick={() => onToggle(tile.date, tile.done)}
        />
      ))}
    </div>
  );
}
