const WEEKS = 15;
const DAYS = 7;

/**
 * An illustration of the thing the product makes: a verified streak grid.
 *
 * The pattern is generated from a fixed seed rather than random, so it doesn't
 * flicker between renders, and it is explicitly captioned as an example — no real
 * person's activity is being shown or implied.
 */
function intensity(week: number, day: number) {
  // A cheap deterministic hash: stable, and uneven enough to look like a real year.
  const hash = (week * 73 + day * 151 + ((week * day) % 11) * 31) % 100;
  const recent = week > WEEKS - 5;

  if (recent) return hash < 12 ? 2 : hash < 45 ? 3 : 4;
  if (hash < 26) return 0;
  if (hash < 48) return 1;
  if (hash < 72) return 2;
  return hash < 90 ? 3 : 4;
}

export default function AuthPreview() {
  const cells = [];
  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < DAYS; day++) {
      const level = intensity(week, day);
      const isToday = week === WEEKS - 1 && day === DAYS - 1;
      cells.push(
        <span
          key={`${week}-${day}`}
          className={`cell cell-${level}${isToday ? " cell-today" : ""}`}
        />,
      );
    }
  }

  return (
    <figure className="auth-preview">
      <div className="auth-preview-head">
        <span className="auth-preview-streak num">38</span>
        <span className="auth-preview-label">
          days running
          <span className="badge badge-verified">✓ Verified</span>
        </span>
      </div>

      <div className="auth-preview-grid" aria-hidden="true">
        {cells}
      </div>

      <figcaption>
        An example. Green days were read back from the platform — not ticked by hand.
      </figcaption>
    </figure>
  );
}
