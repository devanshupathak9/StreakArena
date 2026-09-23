import Scenery from "./ui/Scenery";

/** Rotates by date so the page isn't identical every morning, but never mid-session. */
const QUOTES = [
  "Small steps every day lead to big results.",
  "Discipline today creates a better you tomorrow.",
  "You don't rise to your goals. You fall to your habits.",
  "The streak is the proof. Keep it alive.",
  "Consistency beats intensity, every single week.",
  "One more day. That's the whole trick.",
];

export function quoteForDate(date: string) {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) % 9973;
  return QUOTES[hash % QUOTES.length];
}

export default function Hero({ today }: { today: string }) {
  return (
    <section className="hero">
      <Scenery variant="hero" />

      <div className="hero-body">
        <h1 className="hero-title">
          Consistency <span className="hero-accent">wins.</span>
        </h1>
        {/* One line: the spec is explicit, so the copy can't be allowed to wrap. */}
        <p className="hero-sub">
          <strong>Turn your goals into streaks.</strong>{" "}
          <span>Track, prove and compete with your friends.</span>
        </p>
      </div>

      <figure className="hero-quote">
        <blockquote>“{quoteForDate(today)}”</blockquote>
        <span className="hero-quote-rule" aria-hidden="true" />
      </figure>
    </section>
  );
}
