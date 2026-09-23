import wide from "../../assets/summit.webp";
import crop from "../../assets/summit-crop.webp";

/**
 * The summit artwork behind the hero, the group banners and the quote tile.
 *
 * Two encodes rather than one: the hero is a wide letterbox, while the narrow
 * cards would otherwise scale an 1800px frame down to 400 and lose the figure
 * entirely, so they get a tight crop of the summit instead.
 *
 * Every variant lays a dark scrim over the photograph — the text on top is white
 * and the sky underneath is not, so legibility can't be left to the picture.
 */
type Props = {
  variant?: "hero" | "banner" | "cover";
  className?: string;
  /** Shifts the crop so two group cards side by side don't look identical. */
  offset?: number;
};

export default function Scenery({ variant = "hero", className = "", offset }: Props) {
  const isHero = variant === "hero";

  return (
    <div className={`scenery scenery-${variant} ${className}`} aria-hidden="true">
      <img
        src={isHero ? wide : crop}
        alt=""
        loading={isHero ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={isHero ? "high" : "auto"}
        style={offset === undefined ? undefined : { objectPosition: `${offset}% 50%` }}
      />
      <span className="scenery-scrim" />
    </div>
  );
}
