import { NextResponse } from "next/server";

import { getPetsWithMetrics } from "@/lib/pets";
import {
  SEARCH_LIMITS,
  type SortKey,
  searchPets,
} from "@/lib/pet-search";
import { PET_KINDS, PET_VIBES, type PetKind, type PetVibe } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIND_SET = new Set<string>(PET_KINDS);
const VIBE_SET = new Set<string>(PET_VIBES);
const SORT_SET = new Set<SortKey>([
  "curated",
  "popular",
  "installed",
  "alpha",
]);

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const params = url.searchParams;

  const q = params.get("q") ?? undefined;

  const kinds = parseList(params.get("kinds"))
    .filter((k) => KIND_SET.has(k)) as PetKind[];
  const vibes = parseList(params.get("vibes"))
    .filter((v) => VIBE_SET.has(v)) as PetVibe[];

  const sortRaw = (params.get("sort") ?? "curated").toLowerCase();
  const sort: SortKey = SORT_SET.has(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : "curated";

  const cursor = parseIntSafe(params.get("cursor"), 0);
  const limit = parseIntSafe(
    params.get("limit"),
    SEARCH_LIMITS.DEFAULT_LIMIT,
  );

  const all = await getPetsWithMetrics();
  const result = searchPets(all, { q, kinds, vibes, sort, cursor, limit });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=20, s-maxage=30",
    },
  });
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseIntSafe(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
