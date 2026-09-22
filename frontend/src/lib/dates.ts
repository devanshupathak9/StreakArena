// Dates from the API are bare "YYYY-MM-DD" strings already in the user's timezone,
// so format them as UTC to keep the browser's own offset from shifting them.
const asUtc = (date: string) => new Date(`${date}T00:00:00Z`);

export function formatDay(date: string) {
  return asUtc(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayIndex(date: string) {
  return asUtc(date).getUTCDay();
}

/** "3 minutes ago" — for sync timestamps, which are real instants, not bare dates. */
export function formatWhen(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  let chosen: [Intl.RelativeTimeFormatUnit, number] = units[0];
  for (const unit of units) if (seconds >= unit[1]) chosen = unit;
  return format.format(-Math.round(seconds / chosen[1]), chosen[0]);
}
