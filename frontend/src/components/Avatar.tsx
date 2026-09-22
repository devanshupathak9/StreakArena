import { useState } from "react";

type Props = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: number;
};

/** A stable hue per username, so someone's colour doesn't change between pages. */
function hue(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) % 360;
  return hash;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * An image when one is set, initials otherwise — and initials again if the image
 * fails, so a dead URL degrades instead of leaving a broken-image icon.
 */
export default function Avatar({ username, displayName, avatarUrl, size = 40 }: Props) {
  const [broken, setBroken] = useState(false);
  const label = displayName || username;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (avatarUrl && !broken) {
    return (
      <img
        className="avatar"
        src={avatarUrl}
        alt=""
        style={style}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="avatar avatar-initials"
      style={{ ...style, background: `hsl(${hue(username)} 55% 32%)` }}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
