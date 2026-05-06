// Server-render-friendly, animation-free variant of PetSprite. Used in
// list contexts where rendering many sprites at once (leaderboard rows,
// owner mini-grids) would tank scroll perf if every sprite ran a CSS
// step animation + paint.
//
// Renders the first idle frame (col 0, row 0) of the sheet by clamping
// background-position. No setInterval, no infinite keyframe — just a
// static crop that the browser paints once and is done with.

import type { CSSProperties } from "react";

type StaticPetSpriteProps = {
  src: string;
  scale?: number;
  label?: string;
  className?: string;
};

export function StaticPetSprite({
  src,
  scale = 1,
  label,
  className = "",
}: StaticPetSpriteProps) {
  return (
    <div
      className={`pet-sprite-frame ${className}`}
      role="img"
      aria-label={label ?? "Pet"}
      style={{ "--pet-scale": scale } as CSSProperties}
    >
      <div
        className="pet-sprite-static"
        style={{ "--sprite-url": `url(${src})` } as CSSProperties}
      />
    </div>
  );
}
