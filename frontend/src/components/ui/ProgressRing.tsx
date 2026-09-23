/** Today's completion as a ring. Stroke-dasharray beats a canvas for 110px of arc. */
type Props = { done: number; total: number; size?: number };

export default function ProgressRing({ done, total, size = 112 }: Props) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 ? 0 : done / total;

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--tile-0)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--verdict)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-arc"
        />
      </svg>
      <div className="ring-label">
        <span className="ring-value num">
          {done}/{total}
        </span>
        <span className="ring-caption">completed</span>
      </div>
    </div>
  );
}
