// Multi-pet squad preview for collection cards. Replaces the single
// cover sprite with 4-6 pets distributed across the card so it reads
// as a curated set at a glance — not a tidy line-up but not chaos
// either. Sizes and positions are derived deterministically from the
// pet's slug so the layout is stable across renders (no React key
// flicker, SSR/client agree) but feels hand-arranged.
//
// Why deterministic over Math.random(): hydration mismatches if the
// server picks one offset and the client picks another; a slug-derived
// pseudo-hash gives both sides the same answer without coordination.

import type { PetWithMetrics } from "@/lib/pets";

import { PetSprite } from "@/components/pet-sprite";

type CollectionCoverProps = {
  pets: PetWithMetrics[];
  /** Slug to render largest and most prominent. Falls back to first pet. */
  coverSlug: string | null;
  /** Max sprites rendered. Defaults to 5 (works on mobile). */
  max?: number;
  /** Base sprite scale; lead is rendered larger via the layout below. */
  scale?: number;
  className?: string;
};

// Cheap deterministic hash so a given slug always lands at the same
// horizontal/vertical jitter and size. Same hash on server + client.
function hashSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Map a hash to a value in [0, 1) without bias the way `% 1000 / 1000`
// would. Good enough for visual variety.
function frac(h: number, salt: number): number {
  const x = Math.sin(h * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function CollectionCover({
  pets,
  coverSlug,
  max = 5,
  scale = 0.55,
  className = "",
}: CollectionCoverProps) {
  if (pets.length === 0) {
    return (
      <div
        className={`pet-sprite-stage relative grid aspect-[16/9] place-items-center overflow-hidden ${className}`}
      >
        <span className="font-mono text-xs tracking-[0.18em] text-muted-3 uppercase">
          Collection
        </span>
      </div>
    );
  }

  // Lead pet up front; everyone else dedup'd and trimmed.
  const coverPet = coverSlug
    ? (pets.find((p) => p.slug === coverSlug) ?? null)
    : null;
  const otherPets = pets.filter((p) => p.slug !== coverPet?.slug);
  const lineup = (coverPet ? [coverPet, ...otherPets] : otherPets).slice(
    0,
    max,
  );

  if (lineup.length === 1) {
    return (
      <div
        className={`pet-sprite-stage relative grid aspect-[16/9] place-items-center overflow-hidden ${className}`}
      >
        <PetSprite
          src={lineup[0].spritesheetPath}
          cycleStates
          scale={scale * 1.5}
          label={`${lineup[0].displayName} animated`}
        />
      </div>
    );
  }

  // Layout: distribute pets across X axis in even slots, then nudge each
  // pet's Y position based on its slug hash so they don't all sit on
  // one baseline. Lead pet gets the center slot and the largest scale;
  // the rest fan out around it with slightly smaller scales picked
  // deterministically.
  const n = lineup.length;
  const ordered = (() => {
    if (n <= 1) return lineup;
    // Center the lead and alternate the rest left/right around it so the
    // composition feels balanced regardless of count.
    const [lead, ...rest] = lineup;
    const middle = Math.floor((n - 1) / 2);
    const arranged: typeof lineup = [];
    for (let i = 0; i < n; i++) arranged.push(lead);
    arranged[middle] = lead;
    let leftCursor = middle - 1;
    let rightCursor = middle + 1;
    let toggle = true;
    for (const pet of rest) {
      if (toggle && leftCursor >= 0) {
        arranged[leftCursor--] = pet;
      } else if (rightCursor < n) {
        arranged[rightCursor++] = pet;
      } else if (leftCursor >= 0) {
        arranged[leftCursor--] = pet;
      }
      toggle = !toggle;
    }
    return arranged;
  })();

  return (
    <div
      className={`pet-sprite-stage relative aspect-[16/9] overflow-hidden ${className}`}
    >
      {ordered.map((pet, i) => {
        const isLead =
          pet.slug === lineup[0].slug && i === Math.floor((n - 1) / 2);
        const h = hashSlug(pet.slug);

        // Each pet owns a slot's worth of horizontal real estate so they
        // never overlap. The slot itself is centered on the X axis.
        const slotPct = 100 / n;
        const xCenter = slotPct * (i + 0.5);

        // Vertical jitter: ±15% from the visual baseline (50% of the
        // box puts the pet's center near the middle). Lead sits closest
        // to baseline so the eye locks on it first.
        const yJitter = (frac(h, 1) - 0.5) * 0.3; // -0.15 .. +0.15
        const yCenter = isLead ? 0.55 : 0.5 + yJitter;

        // Size jitter: lead is biggest, others vary 0.85x..1.15x of base.
        const sizeJitter = isLead ? 1.5 : 0.85 + frac(h, 2) * 0.3;
        const petScale = scale * sizeJitter;

        // Subtle z order: lead in front, others stacked back-to-front
        // by hash so adjacent pets don't always overlap the same way.
        const zIndex = isLead ? n + 10 : 5 + Math.floor(frac(h, 3) * n);

        return (
          <div
            key={pet.slug}
            className="absolute flex items-center justify-center"
            style={{
              left: `${xCenter}%`,
              top: `${yCenter * 100}%`,
              transform: "translate(-50%, -50%)",
              zIndex,
              // Each slot is wide enough to hold the sprite without
              // bleeding into its neighbor. Aspect-ratio of the card
              // means the slot height ~= (cardHeight) so the sprite
              // can grow vertically too.
              width: `${slotPct}%`,
              height: "100%",
            }}
          >
            <PetSprite
              src={pet.spritesheetPath}
              cycleStates
              scale={petScale}
              label={`${pet.displayName} animated`}
            />
          </div>
        );
      })}
    </div>
  );
}
