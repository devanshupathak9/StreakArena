// Day boundaries are per-user: a completion is stored as the calendar date it was
// on *in the user's timezone*, so everything downstream is plain date arithmetic.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The calendar date an instant falls on in an IANA timezone, as "YYYY-MM-DD". */
export function dateInTz(instant, timezone) {
  // en-CA formats as YYYY-MM-DD, which is exactly what we want to store.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(instant);
}

/** Current calendar date in an IANA timezone. */
export function todayInTz(timezone) {
  return dateInTz(new Date(), timezone);
}

export function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function isValidDateString(value) {
  return typeof value === "string" && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Shift a "YYYY-MM-DD" string by n days (n may be negative). */
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The n days ending on `today`, oldest first — the tile grid. */
export function lastNDays(today, n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) days.push(addDays(today, -i));
  return days;
}

/** Prisma @db.Date round-tripping: store/read at UTC midnight. */
export function toDbDate(date) {
  return new Date(`${date}T00:00:00Z`);
}

export function fromDbDate(value) {
  return value.toISOString().slice(0, 10);
}

/**
 * Consecutive days done, counting back from today. If today isn't marked yet the
 * streak is measured from yesterday, so it doesn't read as broken at 9am before
 * you've had a chance to do the task.
 */
export function currentStreak(dates, today) {
  const done = new Set(dates);
  let cursor = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive days ever recorded. */
export function longestStreak(dates) {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const date of sorted) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    if (run > best) best = run;
    previous = date;
  }
  return best;
}
