import type { Tile } from "./api";

export type WeekDay = {
  key: string;
  done: boolean;
  verified: boolean;
  future: boolean;
  isToday: boolean;
};

/**
 * The seven days of the week today falls in, Monday first. One source for the
 * strip and for the "4/7" beside it, so the squares and the count can't disagree.
 */
export function weekDays(tiles: Tile[], today: string): WeekDay[] {
  const byDate = new Map(tiles.map((tile) => [tile.date, tile]));
  const base = new Date(`${today}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const tile = byDate.get(key);
    return {
      key,
      done: Boolean(tile?.done),
      verified: Boolean(tile?.verified),
      future: key > today,
      isToday: key === today,
    };
  });
}
