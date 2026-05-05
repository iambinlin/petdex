// Multi-pet squad preview for collection cards. Replaces the single
// cover sprite with 4-6 pets rendered side-by-side so the card reads
// as a curated set at a glance. Cover pet (if present) is rendered
// largest and centered; the rest fan out around it.

import type { PetWithMetrics } from "@/lib/pets";

import { PetSprite } from "@/components/pet-sprite";

type CollectionCoverProps = {
  pets: PetWithMetrics[];
  /** Slug to show as the lead/center pet. Falls back to first pet. */
  coverSlug: string | null;
  /** Max sprites rendered side-by-side. Defaults to 5 (works on mobile too). */
  max?: number;
  /** Sprite scale multiplier. Lead pet is rendered 1.2x of this. */
  scale?: number;
  className?: string;
};

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

  // Pull the cover pet to the front; dedupe and trim to `max` so the row
  // never overflows the card.
  const coverPet = coverSlug
    ? (pets.find((p) => p.slug === coverSlug) ?? null)
    : null;
  const otherPets = pets.filter((p) => p.slug !== coverPet?.slug);
  const lineup = (coverPet ? [coverPet, ...otherPets] : otherPets).slice(
    0,
    max,
  );

  // Single pet → keep the original centered hero.
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

  return (
    <div
      className={`pet-sprite-stage relative flex aspect-[16/9] items-end justify-center gap-1 overflow-hidden px-3 pb-2 sm:gap-2 sm:px-4 ${className}`}
    >
      {lineup.map((pet, i) => {
        // Lead is index 0 — render bigger and pull it forward in the
        // stack so its sprite isn't clipped by neighbors.
        const isLead = i === 0;
        return (
          <div
            key={pet.slug}
            className="flex flex-1 items-end justify-center"
            style={{ zIndex: isLead ? lineup.length + 1 : lineup.length - i }}
          >
            <PetSprite
              src={pet.spritesheetPath}
              cycleStates
              scale={isLead ? scale * 1.2 : scale}
              label={`${pet.displayName} animated`}
            />
          </div>
        );
      })}
    </div>
  );
}
