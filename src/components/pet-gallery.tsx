"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@vercel/analytics";
import {
  Check,
  ChevronDown,
  Heart,
  Loader2,
  Plus,
  Search,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";

import type { PetWithMetrics } from "@/lib/pets";
import { petStates } from "@/lib/pet-states";
import {
  PET_KINDS,
  PET_VIBES,
  type PetKind,
  type PetVibe,
} from "@/lib/types";

import { PetActionMenu } from "@/components/pet-action-menu";
import { PetSprite } from "@/components/pet-sprite";
import { isAllowedAvatarUrl } from "@/lib/url-allowlist";

type Facets = {
  kinds: Record<string, number>;
  vibes: Record<string, number>;
};

type SearchMode = "vibe" | "keyword" | "all";

type SearchPayload = {
  pets: PetWithMetrics[];
  total: number;
  nextCursor: number | null;
  searchMode?: SearchMode;
  facets: Facets;
};

type PetGalleryProps = {
  initial: SearchPayload;
  totalPets: number;
};

type SortKey = "curated" | "popular" | "installed" | "alpha";

const SORT_LABELS: Record<SortKey, string> = {
  curated: "Curated",
  popular: "Most liked",
  installed: "Most installed",
  alpha: "Alphabetical",
};

const PAGE_SIZE = 24;

export function PetGallery({ initial, totalPets }: PetGalleryProps) {
  const [query, setQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<PetKind>>(new Set());
  const [activeVibes, setActiveVibes] = useState<Set<PetVibe>>(new Set());
  const [sort, setSort] = useState<SortKey>("curated");

  const [pets, setPets] = useState<PetWithMetrics[]>(initial.pets);
  const [total, setTotal] = useState<number>(initial.total);
  const [nextCursor, setNextCursor] = useState<number | null>(
    initial.nextCursor,
  );
  const [facets, setFacets] = useState<Facets>(initial.facets);
  const [searchMode, setSearchMode] = useState<SearchMode>(
    initial.searchMode ?? "all",
  );
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestSeq = useRef(0);
  const stateCount = petStates.length;

  const buildParams = useCallback(
    (cursor: number) => {
      const p = new URLSearchParams();
      const trimmed = query.trim();
      if (trimmed) p.set("q", trimmed);
      if (activeKinds.size > 0)
        p.set("kinds", [...activeKinds].join(","));
      if (activeVibes.size > 0)
        p.set("vibes", [...activeVibes].join(","));
      if (sort !== "curated") p.set("sort", sort);
      if (cursor > 0) p.set("cursor", String(cursor));
      p.set("limit", String(PAGE_SIZE));
      return p;
    },
    [query, activeKinds, activeVibes, sort],
  );

  // Re-fetch on filter / sort / query changes (debounced for the query).
  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoadingPage(true);
    const handle = window.setTimeout(async () => {
      try {
        const params = buildParams(0);
        const res = await fetch(`/api/pets/search?${params}`);
        const data = (await res.json()) as SearchPayload;
        if (seq !== requestSeq.current) return;
        setPets(data.pets);
        setTotal(data.total);
        setNextCursor(data.nextCursor);
        setFacets(data.facets);
        const mode = data.searchMode ?? "all";
        setSearchMode(mode);
        // Track only meaningful searches (skip the empty initial load
        // and very short typing). 'no_results' fires its own event
        // because it gates the request CTA — we want to know which
        // queries miss most often.
        if (query.trim().length >= 4 && mode !== "all") {
          track("gallery_searched", {
            mode,
            length: query.trim().length,
            results: data.total,
          });
          if (data.total === 0) {
            track("gallery_no_results", {
              query_length: query.trim().length,
              mode,
            });
          }
        }
      } catch {
        // soft-fail: keep whatever's already on screen
      } finally {
        if (seq === requestSeq.current) setLoadingPage(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    if (nextCursor == null || loadingMore || loadingPage) return;
    const seq = requestSeq.current;
    setLoadingMore(true);
    try {
      const params = buildParams(nextCursor);
      const res = await fetch(`/api/pets/search?${params}`);
      const data = (await res.json()) as SearchPayload;
      if (seq !== requestSeq.current) return;
      setPets((prev) => [...prev, ...data.pets]);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    } catch {
      // ignore, sentinel will retry on next intersect
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, loadingPage, buildParams]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const toggleKind = (kind: PetKind) =>
    setActiveKinds((c) => toggleSet(c, kind));
  const toggleVibe = (vibe: PetVibe) =>
    setActiveVibes((c) => toggleSet(c, vibe));

  const clearFilters = () => {
    setActiveKinds(new Set());
    setActiveVibes(new Set());
    setQuery("");
  };

  const filtersActive =
    activeKinds.size > 0 || activeVibes.size > 0 || query.length > 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[#6478f6] uppercase">
            Gallery — {totalPets} pets
          </p>
          <h2 className="mt-1.5 text-3xl font-medium tracking-tight text-black md:text-4xl">
            Pick a companion
          </h2>
        </div>
        {filtersActive ? (
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
            <span>
              {total} match{total === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              onClick={() => {
                track("filters_cleared");
                clearFilters();
              }}
              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-stone-700 transition hover:border-black/30 hover:text-black"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* Unified control bar: search input takes full width, sort sits to the
          right, filter chips wrap below. Whole thing gets the same subtle
          shadow as the announcement modal so it reads as one cohesive
          surface and the search bar feels like a primary action. */}
      <div className="space-y-3 rounded-3xl border border-black/[0.06] bg-white px-3 py-3 shadow-[0_8px_24px_-12px_rgba(56,71,245,0.18)] md:px-4 md:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block w-full flex-1">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 size-4 text-stone-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try 'cozy night programmer' or 'fierce dragon'"
              className="h-11 w-full rounded-full border border-black/10 bg-white pr-10 pl-11 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#5266ea]/60 focus:ring-2 focus:ring-[#5266ea]/15"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="-translate-y-1/2 absolute top-1/2 right-3 grid size-6 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={(e) => {
                const next = e.target.value as SortKey;
                track("sort_changed", { sort: next });
                setSort(next);
              }}
              aria-label="Sort pets"
              className="h-11 w-full cursor-pointer appearance-none rounded-full border border-black/10 bg-white pr-9 pl-4 text-sm text-stone-900 outline-none transition hover:border-black/30 focus:border-black/40 sm:w-auto sm:min-w-[160px]"
            >
              {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    Sort: {label}
                  </option>
                ),
              )}
            </select>
            <ChevronDown className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 size-4 text-stone-500" />
          </div>
        </div>

        {/* Filter chips: kind + vibe in one continuous wrap row. Saves a
            whole horizontal label column and roughly half the height vs
            the previous two-row layout. */}
        <div className="flex flex-wrap gap-1.5 border-t border-black/[0.05] pt-3">
          <FilterChips
            options={PET_KINDS}
            counts={facets.kinds}
            active={activeKinds}
            onToggle={(v) => toggleKind(v as PetKind)}
            tone="kind"
          />
          <FilterChips
            options={PET_VIBES}
            counts={facets.vibes}
            active={activeVibes}
            onToggle={(v) => toggleVibe(v as PetVibe)}
            tone="vibe"
          />
        </div>
      </div>

      {searchMode === "vibe" && pets.length > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#6478f6]/35 bg-[#eef1ff]/70 px-4 py-2.5 text-sm text-[#202127]">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#5266ea] text-white">
            <Sparkles className="size-3" />
          </span>
          <span>
            Showing pets that vibe with{" "}
            <span className="font-medium">"{query.trim()}"</span>. Closer to
            the top means stronger match.
          </span>
        </div>
      ) : null}

      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-5 ${
          loadingPage ? "opacity-60 transition" : ""
        }`}
      >
        {pets.map((pet, index) => (
          <PetCard
            key={pet.slug}
            pet={pet}
            index={index}
            stateCount={stateCount}
          />
        ))}
      </div>

      {pets.length === 0 && !loadingPage ? (
        <NoResults
          query={query.trim()}
          mode={searchMode}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
        />
      ) : null}

      {nextCursor != null ? (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-8"
          aria-hidden="true"
        >
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-stone-500 uppercase">
              <Loader2 className="size-3.5 animate-spin" />
              Loading more
            </span>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="rounded-full border border-black/10 bg-white px-4 py-2 font-mono text-[11px] tracking-[0.12em] text-stone-700 uppercase transition hover:border-black/30"
            >
              Load more
            </button>
          )}
        </div>
      ) : pets.length > 0 ? (
        <p className="py-6 text-center font-mono text-[10px] tracking-[0.22em] text-stone-400 uppercase">
          End of gallery — {total} shown
        </p>
      ) : null}
    </section>
  );
}

type FilterChipsProps = {
  options: readonly string[];
  counts: Record<string, number>;
  active: Set<string>;
  onToggle: (value: string) => void;
  tone: "kind" | "vibe";
};

function FilterChips({
  options,
  counts,
  active,
  onToggle,
  tone,
}: FilterChipsProps) {
  return (
    <>
      {options.map((value) => {
        const count = counts[value] ?? 0;
        if (count === 0) return null;
        const isActive = active.has(value);
        const dotClass =
          tone === "kind" ? "bg-[#0a0a0a]/70" : "bg-[#5266ea]";
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              track("filter_toggled", {
                tone,
                value,
                next: isActive ? "off" : "on",
              });
              onToggle(value);
            }}
            aria-pressed={isActive}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] capitalize transition ${
              isActive
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white text-stone-700 hover:border-black/30"
            }`}
          >
            {!isActive ? (
              <span className={`size-1.5 shrink-0 rounded-full ${dotClass}`} />
            ) : null}
            <span>{value}</span>
            <span
              className={`font-mono text-[9px] ${
                isActive ? "text-white/60" : "text-stone-400"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </>
  );
}

type PetCardProps = {
  pet: PetWithMetrics;
  index: number;
  stateCount: number;
};

function PetCard({ pet, index, stateCount }: PetCardProps) {
  const dexNumber = String(index + 1).padStart(3, "0");
  const { likeCount, installCount } = pet.metrics;
  const showMetrics = likeCount > 0 || installCount > 0;
  const href = `/pets/${pet.slug}`;

  return (
    <article
      className={`group relative rounded-3xl border bg-white/76 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-blue-950/10 ${
        pet.featured
          ? "border-[#6478f6]/45 shadow-[0_0_0_1px_rgba(100,120,246,0.18),0_18px_45px_-22px_rgba(82,102,234,0.5)]"
          : "border-black/10 shadow-sm shadow-blue-950/5"
      }`}
    >
      <Link
        href={href}
        aria-label={`Open ${pet.displayName}`}
        className="flex flex-col rounded-3xl"
      >
        <div className="flex items-center justify-between rounded-t-3xl border-b border-black/[0.06] px-5 pt-4 pr-12 pb-3">
          <span className="font-mono text-[11px] tracking-[0.22em] text-stone-500 uppercase">
            No. {dexNumber}
          </span>
          {pet.featured ? (
            <span className="font-mono text-[10px] tracking-[0.22em] text-[#5266ea] uppercase">
              ★ Featured
            </span>
          ) : null}
        </div>

        <div
          className="relative flex items-center justify-center overflow-hidden px-5 py-6"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95) 0%, rgba(238,241,255,0.55) 55%, transparent 80%)",
          }}
        >
          <PetSprite
            src={pet.spritesheetPath}
            cycleStates
            scale={0.7}
            label={`${pet.displayName} animated`}
          />
          <span className="pointer-events-none absolute right-5 bottom-2 font-mono text-[10px] tracking-[0.22em] text-stone-400 uppercase">
            {stateCount} states
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-b-3xl border-t border-black/[0.06] px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">
              {pet.displayName}
            </h3>
            <span className="font-mono text-[10px] tracking-[0.18em] text-stone-400 uppercase">
              {pet.kind}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-stone-600">
            {pet.description}
          </p>
          {pet.vibes.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {pet.vibes.map((vibe) => (
                <span
                  key={vibe}
                  className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase"
                >
                  #{vibe}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.05] pt-3">
            {pet.submittedBy ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
                {pet.submittedBy.imageUrl &&
                isAllowedAvatarUrl(pet.submittedBy.imageUrl) ? (
                  // biome-ignore lint/performance/noImgElement: avatar allowlisted above
                  <img
                    src={pet.submittedBy.imageUrl}
                    alt=""
                    className="size-4 rounded-full ring-1 ring-black/10"
                  />
                ) : null}
                by {pet.submittedBy.name}
              </span>
            ) : (
              <span />
            )}
            {showMetrics ? (
              <span className="flex items-center gap-3 font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
                {likeCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" />
                    {compactNumber(likeCount)}
                  </span>
                ) : null}
                {installCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <TerminalSquare className="size-3" />
                    {compactNumber(installCount)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Action menu lives outside the Link so its clicks don't navigate.
          Absolute-positioned to overlap the featured badge corner. */}
      <div className="absolute top-3 right-4 z-20">
        <PetActionMenu
          pet={{
            slug: pet.slug,
            displayName: pet.displayName,
            zipUrl: pet.zipUrl,
            description: pet.description,
          }}
        />
      </div>
    </article>
  );
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function compactNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

// NoResults — empty state. When the user hit a vibe search with no
// matches we offer them to "request this pet": POSTs the query to
// /api/pet-requests which dedup-upvotes if the same idea was already
// asked for, otherwise creates a new request. Captures demand for the
// admin queue at /admin/requests.
function NoResults({
  query,
  mode,
  filtersActive,
  onClearFilters,
}: {
  query: string;
  mode: SearchMode;
  filtersActive: boolean;
  onClearFilters: () => void;
}) {
  const [state, setState] = useState<
    | { tag: "idle" }
    | { tag: "submitting" }
    | { tag: "ok"; mode: "created" | "upvoted"; count: number }
    | { tag: "error"; reason: string }
  >({ tag: "idle" });

  const canRequest = mode === "vibe" && query.length >= 4;

  async function submitRequest() {
    if (!canRequest || state.tag === "submitting") return;
    track("pet_request_clicked", { from: "gallery_empty_state" });
    setState({ tag: "submitting" });
    try {
      const res = await fetch("/api/pet-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          track("pet_request_blocked", { reason: "unauthorized" });
          setState({
            tag: "error",
            reason: "Sign in to request a pet.",
          });
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        track("pet_request_failed", { status: res.status });
        setState({
          tag: "error",
          reason:
            data.message ?? data.error ?? `Request failed (${res.status}).`,
        });
        return;
      }
      const data = (await res.json()) as {
        mode: "created" | "upvoted";
        upvoteCount: number;
      };
      track("pet_request_succeeded", {
        mode: data.mode,
        upvotes: data.upvoteCount,
      });
      setState({
        tag: "ok",
        mode: data.mode,
        count: data.upvoteCount,
      });
    } catch {
      track("pet_request_failed", { reason: "network" });
      setState({ tag: "error", reason: "Network error, try again." });
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 text-center md:p-10">
      <p className="text-sm font-medium text-stone-950">
        No pets match {query ? `"${query}"` : "this view"}.
      </p>

      {canRequest ? (
        state.tag === "ok" ? (
          <div className="mt-4 inline-flex flex-col items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              <Check className="size-3.5" />
              {state.mode === "created"
                ? "Requested. We'll prioritize popular requests."
                : `Upvoted. ${state.count} people want this pet.`}
            </span>
            <Link
              href="/requests"
              className="font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase underline-offset-4 hover:text-black hover:underline"
            >
              See all requests
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="max-w-md text-sm text-stone-600">
              Want a pet that matches{" "}
              <span className="font-medium">"{query}"</span>? Request it and
              other people can upvote.
            </p>
            <button
              type="button"
              onClick={submitRequest}
              disabled={state.tag === "submitting"}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#5266ea] px-4 text-sm font-medium text-white transition hover:bg-[#3847f5] disabled:opacity-60"
            >
              <Plus className="size-4" />
              {state.tag === "submitting" ? "Sending…" : "Request this pet"}
            </button>
            {state.tag === "error" ? (
              <p className="font-mono text-[10px] tracking-[0.12em] text-rose-700 uppercase">
                {state.reason}
              </p>
            ) : null}
          </div>
        )
      ) : filtersActive ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-xs font-medium text-stone-700 transition hover:border-black/30"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
