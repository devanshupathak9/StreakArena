/**
 * Brand marks for the platforms a task can be proved against, plus fallbacks for
 * manual tasks. The reference design puts each one on a light tile, so these are
 * drawn in their own brand colour rather than inheriting text colour.
 */
import { BookOpen, Dumbbell, Sparkles, Target } from "lucide-react";
import type { ReactNode } from "react";

type Props = { platform: string | null; title?: string | null; size?: number };

function Github({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#161b22" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function Leetcode({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13.48 2.4a1.5 1.5 0 0 1 2.14 2.1l-2.6 2.66 4.3 4.33a1.5 1.5 0 0 1-2.13 2.11l-4.3-4.33-3.3 3.37c-1.2 1.23-1.2 3.2 0 4.42l3.3 3.37a1.5 1.5 0 0 1-2.13 2.11l-3.3-3.37a6.15 6.15 0 0 1 0-8.64Z"
        fill="#ffa116"
      />
      <path
        d="M20.5 14.7h-8.2a1.5 1.5 0 0 1 0-3h8.2a1.5 1.5 0 0 1 0 3Z"
        fill="#b3b3b3"
      />
    </svg>
  );
}

function Chess({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5d9948" aria-hidden="true">
      <path d="M12 2a3.2 3.2 0 0 0-2.3 5.45c-.9.5-1.5 1.35-1.5 2.33 0 .6.22 1.15.6 1.6l-1.3 5.3h9l-1.3-5.3c.38-.45.6-1 .6-1.6 0-.98-.6-1.83-1.5-2.33A3.2 3.2 0 0 0 12 2Zm-5.8 16.4h11.6c.55 0 1 .45 1 1v1.6c0 .55-.45 1-1 1H6.2c-.55 0-1-.45-1-1v-1.6c0-.55.45-1 1-1Z" />
    </svg>
  );
}

function Codeforces({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.5" y="8" width="5.5" height="13" rx="1.4" fill="#3b8ede" />
      <rect x="9.25" y="3" width="5.5" height="18" rx="1.4" fill="#f4c150" />
      <rect x="17" y="10.5" width="5.5" height="10.5" rx="1.4" fill="#e3403f" />
    </svg>
  );
}

function Duolingo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12.5" r="9.5" fill="#58cc02" />
      <circle cx="8.6" cy="10.4" r="2.5" fill="#fff" />
      <circle cx="15.4" cy="10.4" r="2.5" fill="#fff" />
      <circle cx="8.6" cy="10.6" r="1.15" fill="#1f2937" />
      <circle cx="15.4" cy="10.6" r="1.15" fill="#1f2937" />
      <path d="M12 13.4c1.5 0 2.6.9 2.6 2S13.5 17.6 12 17.6s-2.6-1.1-2.6-2.2.9-2 2.6-2Z" fill="#ffc200" />
    </svg>
  );
}

const BRANDS: Record<string, (p: { size: number }) => ReactNode> = {
  github: Github,
  leetcode: Leetcode,
  chesscom: Chess,
  codeforces: Codeforces,
  duolingo: Duolingo,
};

/** Manual tasks have no logo, so the title picks a sensible pictogram instead. */
function manualIcon(title: string, size: number) {
  const text = title.toLowerCase();
  const props = { size, strokeWidth: 2, color: "#e11d48" } as const;
  if (/read|book|page|study/.test(text)) return <BookOpen {...props} />;
  if (/gym|workout|run|lift|exercise|yoga/.test(text)) return <Dumbbell {...props} />;
  if (/meditat|journal|sleep|water/.test(text)) return <Sparkles {...props} />;
  return <Target {...props} />;
}

export default function PlatformIcon({ platform, title, size = 22 }: Props) {
  const Brand = platform ? BRANDS[platform] : undefined;
  return (
    <span className="icon-tile" aria-hidden="true">
      {Brand ? <Brand size={size} /> : manualIcon(title ?? "", size)}
    </span>
  );
}
