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
