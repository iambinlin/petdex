"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ExternalLink, Search } from "lucide-react";

import {
  type CollectionKind,
  collectionKind,
  KIND_LABEL,
} from "@/lib/collection-kind";
import type { OwnerCredit } from "@/lib/owner-credit";
import type { PetWithMetrics } from "@/lib/pets";

import { CollectionCover } from "@/components/collection-cover";

type CollectionItem = {
  slug: string;
  title: string;
  description: string;
  ownerId: string | null;
  externalUrl: string | null;
  coverPetSlug: string | null;
  petCount: number;
  pets: PetWithMetrics[];
};

type SortKey = "size" | "title";

const KIND_FILTERS: { value: "all" | CollectionKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "franchise", label: "Franchises" },
  { value: "category", label: "Categories" },
  { value: "category-sub", label: "Themed" },
  { value: "other", label: "Curated" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "size", label: "Largest" },
  { value: "title", label: "A → Z" },
];

export function CollectionsBrowser({
  collections,
  credits,
}: {
  collections: CollectionItem[];
  credits: Record<string, OwnerCredit>;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | CollectionKind>("all");
  const [sort, setSort] = useState<SortKey>("size");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: collections.length };
    for (const c of collections) {
      const k = collectionKind(c.slug);
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [collections]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = collections.filter((c) => {
      if (kind !== "all" && collectionKind(c.slug) !== kind) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    });
    list = [...list];
    list.sort((a, b) => {
      if (sort === "size") return b.petCount - a.petCount;
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [collections, query, kind, sort]);

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 -mx-2 rounded-2xl border border-border-base bg-background/95 p-3 backdrop-blur md:-mx-3 md:top-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative flex flex-1 items-center md:max-w-md">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search collections — title, slug, description"
              className="h-10 w-full rounded-full border border-border-base bg-transparent pr-4 pl-9 text-sm placeholder:text-muted-3 focus:outline-none focus:ring-1 focus:ring-brand"
              aria-label="Search collections"
            />
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-3" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-full border border-border-base bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {KIND_FILTERS.map((f) => {
            const c = counts[f.value] ?? 0;
            const active = kind === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setKind(f.value)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                  active
                    ? "border-brand bg-brand text-on-inverse"
                    : "border-border-base bg-transparent text-muted-2 hover:border-border-strong hover:text-foreground"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-mono tracking-wider ${
                    active ? "bg-on-inverse/15" : "bg-surface text-muted-3"
                  }`}
                >
                  {c}
                </span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-3">
            Showing {visible.length} of {collections.length}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-base bg-surface/60 p-10 text-center text-sm text-muted-2">
          No collections match those filters.
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => {
            const owner = c.ownerId ? credits[c.ownerId] : null;
            const k = collectionKind(c.slug);
            return (
              <article
                key={c.slug}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-border-base bg-surface/80"
              >
                <Link href={`/collections/${c.slug}`} className="block">
                  <CollectionCover
                    pets={c.pets}
                    coverSlug={c.coverPetSlug}
                    max={5}
                    scale={0.55}
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-tint px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] text-brand-deep uppercase">
                          {KIND_LABEL[k]}
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
                          {c.petCount} pets
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight">
                        <Link href={`/collections/${c.slug}`}>{c.title}</Link>
                      </h2>
                    </div>
                    {c.externalUrl ? (
                      <Link
                        href={c.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-base bg-surface px-2.5 text-[11px] font-medium text-muted-2 transition hover:border-border-strong"
                      >
                        <ExternalLink className="size-3" />
                        Site
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-2">
                    {c.description}
                  </p>
                  {owner ? (
                    <Link
                      href={`/u/${owner.handle}`}
                      className="mt-auto inline-flex pt-3 text-xs font-medium text-brand hover:underline"
                    >
                      by {owner.name}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
