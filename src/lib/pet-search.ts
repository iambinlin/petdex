// Server-side filter / sort / paginate over the full pet list.
//
// Curated pets live in `data/pets.generated.ts` (in-memory) and approved
// community pets come from Postgres. Both go through `getPetsWithMetrics()`,
// so we just slice in memory here. Cheap below ~500 pets — when we cross that
// we can move to SQL with proper indexes.

import type { PetWithMetrics } from "@/lib/pets";
import type { PetKind, PetVibe } from "@/lib/types";

export type SortKey = "curated" | "popular" | "installed" | "alpha";

export type SearchInput = {
  q?: string;
  kinds?: PetKind[];
  vibes?: PetVibe[];
  sort?: SortKey;
  cursor?: number;
  limit?: number;
};

export type SearchOutput = {
  pets: PetWithMetrics[];
  total: number;
  nextCursor: number | null;
  facets: {
    kinds: Record<string, number>;
    vibes: Record<string, number>;
  };
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export function searchPets(
  all: PetWithMetrics[],
  input: SearchInput,
): SearchOutput {
  const sort = input.sort ?? "curated";
  const limit = clamp(input.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const cursor = Math.max(0, input.cursor ?? 0);
  const q = input.q?.trim().toLowerCase() ?? "";
  const activeKinds = new Set(input.kinds ?? []);
  const activeVibes = new Set(input.vibes ?? []);

  const filtered = all.filter((pet) => {
    if (activeKinds.size > 0 && !activeKinds.has(pet.kind)) return false;
    if (activeVibes.size > 0) {
      const hit = pet.vibes.some((v) => activeVibes.has(v));
      if (!hit) return false;
    }
    if (!q) return true;
    return matchesQuery(pet, q);
  });

  const sorted = sortPets(filtered, sort);
  const slice = sorted.slice(cursor, cursor + limit);
  const nextCursor =
    cursor + limit < sorted.length ? cursor + limit : null;

  // Facets always reflect the *unfiltered* universe so users can see counts
  // even after they've already applied a filter (mirror of the previous
  // client-side gallery behaviour).
  const facets = computeFacets(all);

  return {
    pets: slice,
    total: sorted.length,
    nextCursor,
    facets,
  };
}

function matchesQuery(pet: PetWithMetrics, q: string): boolean {
  const haystack = [
    pet.displayName,
    pet.description,
    pet.kind,
    ...pet.vibes,
    ...pet.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function sortPets(
  pets: PetWithMetrics[],
  key: SortKey,
): PetWithMetrics[] {
  const arr = [...pets];
  switch (key) {
    case "popular":
      arr.sort(
        (a, b) =>
          b.metrics.likeCount - a.metrics.likeCount ||
          a.displayName.localeCompare(b.displayName),
      );
      break;
    case "installed":
      arr.sort(
        (a, b) =>
          b.metrics.installCount - a.metrics.installCount ||
          a.displayName.localeCompare(b.displayName),
      );
      break;
    case "alpha":
      arr.sort((a, b) => a.displayName.localeCompare(b.displayName));
      break;
    case "curated":
    default:
      arr.sort((a, b) => {
        const fa = a.featured ? 0 : 1;
        const fb = b.featured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return a.displayName.localeCompare(b.displayName);
      });
      break;
  }
  return arr;
}

function computeFacets(pets: PetWithMetrics[]): SearchOutput["facets"] {
  const kinds: Record<string, number> = {};
  const vibes: Record<string, number> = {};
  for (const pet of pets) {
    kinds[pet.kind] = (kinds[pet.kind] ?? 0) + 1;
    for (const v of pet.vibes) {
      vibes[v] = (vibes[v] ?? 0) + 1;
    }
  }
  return { kinds, vibes };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export const SEARCH_LIMITS = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
} as const;
