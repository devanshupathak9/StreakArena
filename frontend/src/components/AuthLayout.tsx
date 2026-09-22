import type { ReactNode } from "react";
import AuthPreview from "./AuthPreview";

const POINTS = [
  {
    title: "Link your handles once",
    text: "GitHub, LeetCode, Codeforces, Chess.com, Duolingo.",
  },
  {
    title: "Sync proves it",
    text: "Your real activity is read back from each platform — no self-reporting.",
  },
  {
    title: "Race your friends",
    text: "Shared challenges, a group leaderboard, and a global board for everyone.",
  },
];

/**
 * The signed-out shell: the pitch on the left, the form on the right. The pitch is
 * decorative on a phone, so it collapses to a single line above the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <section className="auth-pitch">
        <div className="auth-pitch-inner">
          <span className="auth-brand">StreakArena</span>

          <h1 className="auth-headline">
            Every streak you're keeping,
            <br />
            on one board.
          </h1>

          <p className="auth-sub">
            LeetCode keeps one. GitHub draws another in green squares. Duolingo nags you about a
            third. StreakArena holds all of them — and checks them for you.
          </p>

          <AuthPreview />

          <ul className="auth-points">
            {POINTS.map((point) => (
              <li key={point.title}>
                <strong>{point.title}</strong>
                <span className="auth-point-text">{point.text}</span>
              </li>
            ))}
          </ul>

          <p className="auth-footnote">
            Public handles only. No platform passwords, ever.
          </p>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-inner">{children}</div>
      </section>
    </div>
  );
}
