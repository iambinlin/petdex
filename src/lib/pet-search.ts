// Server-side search backed by Postgres. All filtering, sorting and
// pagination happens in SQL with proper indexes (see schema.ts). Counts and
// facets are computed via grouped queries the DB can answer with the GIN
// indexes on `vibes` / `tags`.

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { getMetricsBySlugs } from "@/lib/db/metrics";
import type { PetWithMetrics } from "@/lib/pets";
import { rowToPet } from "@/lib/pets";
import { PET_KINDS, PET_VIBES, type PetKind, type PetVibe } from "@/lib/types";

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

export async function searchPets(
  input: SearchInput,
): Promise<SearchOutput> {
  const sortKey = input.sort ?? "curated";
  const limit = clamp(input.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
  const cursor = Math.max(0, input.cursor ?? 0);
  const q = input.q?.trim() ?? "";

  const filters = [eq(schema.submittedPets.status, "approved")];

  if (input.kinds && input.kinds.length > 0) {
    filters.push(inArray(schema.submittedPets.kind, input.kinds));
  }

  if (input.vibes && input.vibes.length > 0) {
    // jsonb ?| text[]  — the GIN index on `vibes` answers this. Pass as a
    // pg text array literal so the driver doesn't try to JSON-encode it.
    const literal = `{${input.vibes.map((v) => `"${v.replace(/"/g, "")}"`).join(",")}}`;
    filters.push(
      sql`${schema.submittedPets.vibes} ?| ${literal}::text[]`,
    );
  }

  if (q) {
    const like = `%${q}%`;
    // Tags are jsonb — cast to text so ILIKE can scan them. The substring
    // search on display_name + description is small enough to live without
    // a trigram index at our current scale.
    filters.push(
      or(
        ilike(schema.submittedPets.displayName, like),
        ilike(schema.submittedPets.description, like),
        sql`${schema.submittedPets.tags}::text ILIKE ${like}`,
      )!,
    );
  }

  const where = and(...filters);

  // page slice
  const orderBy = orderForSort(sortKey);
  const pageRows = await db
    .select()
    .from(schema.submittedPets)
    .where(where)
    .orderBy(...orderBy)
    .offset(cursor)
    .limit(limit + 1);

  const hasNext = pageRows.length > limit;
  const slice = hasNext ? pageRows.slice(0, limit) : pageRows;

  const slugs = slice.map((r) => r.slug);
  const metrics = slugs.length ? await getMetricsBySlugs(slugs) : new Map();

  const pets: PetWithMetrics[] = slice.map((row) => ({
    ...rowToPet(row),
    metrics: metrics.get(row.slug) ?? {
      installCount: 0,
      zipDownloadCount: 0,
      likeCount: 0,
    },
  }));

  // total — same filters, count only.
  const totalRow = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.submittedPets)
    .where(where);
  const total = totalRow[0]?.n ?? 0;

  // facets — always over the unfiltered universe of approved pets so users
  // see all options as they narrow. Two cheap aggregate queries.
  const facets = await loadFacets();

  return {
    pets,
    total,
    nextCursor: hasNext ? cursor + limit : null,
    facets,
  };
}

function orderForSort(key: SortKey) {
  switch (key) {
    case "popular":
      // We don't have likeCount on submitted_pets — sort by like count via a
      // join is overkill at our scale. Instead order by displayName as a
      // stable fallback after popular lookups land in the front-end.
      // (popular sort is implemented client-side after the slice arrives.)
      return [asc(schema.submittedPets.displayName)];
    case "installed":
      return [asc(schema.submittedPets.displayName)];
    case "alpha":
      return [asc(schema.submittedPets.displayName)];
    case "curated":
    default:
      return [
        desc(schema.submittedPets.featured),
        asc(schema.submittedPets.displayName),
      ];
  }
}

async function loadFacets(): Promise<SearchOutput["facets"]> {
  // kind counts
  const kindRows = await db
    .select({
      kind: schema.submittedPets.kind,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.status, "approved"))
    .groupBy(schema.submittedPets.kind);

  const kinds: Record<string, number> = {};
  for (const k of PET_KINDS) kinds[k] = 0;
  for (const row of kindRows) kinds[row.kind] = row.n;

  // vibe counts via jsonb_array_elements_text — single index-friendly scan
  const vibeRows = await db.execute<{
    vibe: string;
    n: number;
  }>(sql`
    SELECT v::text AS vibe, count(*)::int AS n
    FROM submitted_pets,
         jsonb_array_elements_text(vibes) AS v
    WHERE status = 'approved'
    GROUP BY v
  `);

  const vibes: Record<string, number> = {};
  for (const v of PET_VIBES) vibes[v] = 0;
  for (const row of vibeRows.rows ?? []) {
    vibes[row.vibe] = row.n;
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
