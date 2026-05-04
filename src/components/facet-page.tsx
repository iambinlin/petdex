// Shared layout for /vibe/<vibe> and /kind/<kind> programmatic SEO pages.
// Reuses the same gallery card grid as the home page but with a single
// hardcoded filter and a hero block tuned for keyword targeting.

import Link from "next/link";

import { Sparkles } from "lucide-react";

import type { PetWithMetrics } from "@/lib/pets";
import { petStates } from "@/lib/pet-states";

import { CommandLine } from "@/components/command-line";
import { PetActionMenu } from "@/components/pet-action-menu";
import { PetCardFooter } from "@/components/pet-card-footer";
import { PetSprite } from "@/components/pet-sprite";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type FacetPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  count: number;
  pets: PetWithMetrics[];
  exampleSlug?: string;
  relatedLabel: string;
  related: { href: string; label: string; count: number }[];
};

export function FacetPage({
  eyebrow,
  title,
  intro,
  count,
  pets,
  exampleSlug,
  relatedLabel,
  related,
}: FacetPageProps) {
  const stateCount = petStates.length;
  const cmd = `npx petdex install ${exampleSlug ?? pets[0]?.slug ?? "boba"}`;

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />
          <div className="mt-12 flex flex-col items-center text-center md:mt-16">
            <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-[40px] leading-[1] font-semibold tracking-tight md:text-[64px]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-base leading-7 text-[#202127] md:text-lg">
              {intro}
            </p>
            <CommandLine
              command={cmd}
              source="facet-hero"
              className="mt-5 w-full max-w-sm"
            />
            <p className="mt-3 font-mono text-[11px] tracking-[0.18em] text-stone-500 uppercase">
              {count} pets in this collection
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-5">
          {pets.map((pet, index) => (
            <PetCard key={pet.slug} pet={pet} index={index} stateCount={stateCount} />
          ))}
        </div>

        {related.length > 0 ? (
          <aside className="mt-8 rounded-2xl border border-black/[0.08] bg-white/55 px-5 py-6 backdrop-blur md:px-7">
            <p className="font-mono text-[11px] tracking-[0.22em] text-stone-500 uppercase">
              {relatedLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-3 font-mono text-[11px] tracking-[0.08em] capitalize text-stone-700 transition hover:border-black/30"
                >
                  <span>{r.label}</span>
                  <span className="text-[10px] text-stone-400">{r.count}</span>
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

export function PetCard({
  pet,
  index,
  stateCount,
}: {
  pet: PetWithMetrics;
  index: number;
  stateCount: number;
}) {
  const dexNumber = String(index + 1).padStart(3, "0");
  const { likeCount, installCount } = pet.metrics;
  const isDiscovered = pet.source === "discover";

  return (
    <article
      className={`group relative rounded-3xl border bg-white/76 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-blue-950/10 ${
        pet.featured
          ? "border-[#6478f6]/45 shadow-[0_0_0_1px_rgba(100,120,246,0.18),0_18px_45px_-22px_rgba(82,102,234,0.5)]"
          : "border-black/10 shadow-sm shadow-blue-950/5"
      }`}
    >
      <Link
        href={`/pets/${pet.slug}`}
        aria-label={`Open ${pet.displayName}`}
        className="flex flex-col rounded-3xl"
      >
        <div className="flex items-center justify-between rounded-t-3xl border-b border-black/[0.06] px-5 pt-4 pr-12 pb-3">
          <span className="font-mono text-[11px] tracking-[0.22em] text-stone-500 uppercase">
            No. {dexNumber}
          </span>
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
        <div className="flex flex-col gap-2 border-t border-black/[0.06] px-5 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-1.5 text-lg font-semibold tracking-tight text-stone-950">
              <span className="truncate">{pet.displayName}</span>
              {pet.featured ? (
                <span
                  aria-label="Featured"
                  title="Featured"
                  className="font-mono text-[10px] text-[#5266ea]"
                >
                  ★
                </span>
              ) : null}
            </h3>
            <span className="font-mono text-[10px] tracking-[0.18em] text-stone-400 uppercase">
              {pet.kind}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-stone-600">
            {pet.description}
          </p>
          {isDiscovered ? (
            <span
              className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-amber-900 uppercase ring-1 ring-amber-200"
              title="Added on behalf of the original author. Not yet claimed."
            >
              <Sparkles className="size-3" />
              Discovered
            </span>
          ) : null}
        </div>
      </Link>

      {/* Footer bar — outside the card-wide Link so each button can
          fire its own action without bubbling up to navigation. */}
      <div className="rounded-b-3xl">
        <PetCardFooter
          slug={pet.slug}
          displayName={pet.displayName}
          zipUrl={pet.zipUrl}
          installCount={installCount}
          likeCount={likeCount}
        />
      </div>

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
