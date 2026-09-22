import { Link } from "react-router-dom";

const PLATFORMS = [
  { label: "GitHub", detail: "Any day with contributions" },
  { label: "LeetCode", detail: "Any day you submitted a solution" },
  { label: "Codeforces", detail: "Any day you submitted, solved or not" },
  { label: "Chess.com", detail: "Any day you finished a game" },
  { label: "Duolingo", detail: "The days in your current streak" },
];

export default function About() {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>About StreakArena</h1>
          <p className="muted">One place for every streak you're keeping.</p>
        </div>
      </div>

      <section className="card stack">
        <h2>The idea</h2>
        <p className="prose">
          Your streaks are scattered. LeetCode keeps one, GitHub draws another in green squares,
          Duolingo nags you about a third. None of them know about each other, and none of them
          cover the things you do off-platform.
        </p>
        <p className="prose">
          StreakArena is the one board that holds all of them. Link your handle once, tag a task
          with that platform, and <strong>Sync</strong> reads your real activity back — so the
          streak is evidence, not a promise you made to yourself.
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Where streaks come from</h2>
          <p className="muted small">Link a handle in Profile</p>
        </div>
        <div className="about-grid">
          {PLATFORMS.map((platform) => (
            <div key={platform.label} className="about-item">
              <strong>{platform.label}</strong>
              <p className="muted small">{platform.detail}</p>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: "var(--space-4)" }}>
          A task with no platform is yours to tick by hand — the gym doesn't have an API.
        </p>
      </section>

      <section className="card stack">
        <h2>How the rules work</h2>
        <ul className="prose">
          <li>
            <strong>Your day, your clock.</strong> A completion is stored as the calendar date it
            was in <em>your</em> timezone, so midnight follows you instead of a server in another
            country.
          </li>
          <li>
            <strong>Nothing is broken before it's late.</strong> If today isn't marked yet, your
            streak counts back from yesterday — it won't read as broken at 9am.
          </li>
          <li>
            <strong>Sync only adds.</strong> A day you ticked yourself is never overwritten, and a
            day a platform stops reporting is left alone. Sync can add to your record, not rewrite
            it.
          </li>
          <li>
            <strong>Groups can't cost you anything.</strong> Leaving a group, or the owner deleting
            it, detaches your copy of the challenge and leaves the streak with you.
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Competing</h2>
        <p className="prose">
          <Link to="/groups">Groups</Link> are for friends: share a six-character code, agree on
          challenges, and everyone races the same ones. The leaderboard ranks by combined live
          streaks — today's form, not lifetime totals — and measures each person against their own
          midnight.
        </p>
        <p className="prose">
          The <Link to="/global">global dashboard</Link> is everyone on this server at once.
        </p>
      </section>

      <p className="muted small">
        Built with React, Express and Postgres. Your handles are public ones — StreakArena stores no
        passwords for any platform and never acts on your behalf.
      </p>
    </div>
  );
}
