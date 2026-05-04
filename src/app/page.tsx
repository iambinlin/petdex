import Link from "next/link";

import { Download } from "lucide-react";

import { getAllPetsPackPath } from "@/lib/downloads";
import { searchPets } from "@/lib/pet-search";
import {
  type PetWithMetrics,
  getApprovedPetCount,
  getFeaturedPetsWithMetrics,
} from "@/lib/pets";

import { CommandLine } from "@/components/command-line";
import { JsonLd } from "@/components/json-ld";
import { PetGallery } from "@/components/pet-gallery";
import { PetSprite } from "@/components/pet-sprite";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackOnClick } from "@/components/track-on-click";

export const dynamic = "force-dynamic";

const SITE_URL = "https://petdex.crafter.run";

export default async function Home() {
  const [heroPets, totalPets, initialSearch] = await Promise.all([
    getFeaturedPetsWithMetrics(6),
    getApprovedPetCount(),
    searchPets({ sort: "curated" }),
  ]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Petdex",
      url: `${SITE_URL}/`,
      description:
        "Public gallery of animated pixel pets for the Codex CLI. Install one with a single command.",
      publisher: {
        "@type": "Organization",
        name: "Crafter Station",
        url: "https://crafter.run",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?q={search_term_string}#gallery`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Featured Codex pets",
      numberOfItems: heroPets.length,
      itemListElement: heroPets.map((pet, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/pets/${pet.slug}`,
        name: pet.displayName,
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <JsonLd data={jsonLd} />
      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />

          <div className="mt-12 flex flex-col items-center text-center md:mt-16">
            <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
              The Codex pet index
            </p>
            <h1 className="mt-3 text-[48px] leading-[0.98] font-semibold tracking-tight md:text-[80px]">
              Petdex
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-7 text-muted-1 md:text-lg">
              The public gallery of animated pixel pets for the{" "}
              <strong>Codex CLI</strong>. Browse {totalPets}+ open-source
              companions, preview their states, and install one with a single
              command.
            </p>
            <CommandLine
              command="npx petdex install boba"
              source="hero"
              className="mt-5 w-full max-w-sm"
            />
          </div>

          <HeroPetParade pets={heroPets} />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <TrackOnClick
              event="pack_downloaded"
              payload={{ scope: "all" }}
              href={getAllPetsPackPath()}
              download
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:hover:bg-stone-200"
            >
              <Download className="size-4" />
              Download all pets
            </TrackOnClick>
            <Link
              href="#gallery"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 text-sm font-medium text-black backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              Browse gallery
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 text-sm font-medium text-black backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              CLI docs
            </Link>
          </div>
        </div>
      </section>

      <section
        id="gallery"
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-12 md:px-8 md:py-16"
      >
        {totalPets > 0 ? (
          <PetGallery initial={initialSearch} totalPets={totalPets} />
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}

type HeroPetParadeProps = {
  pets: PetWithMetrics[];
};

function HeroPetParade({ pets }: HeroPetParadeProps) {
  if (pets.length === 0) return null;

  return (
    <div className="mt-10 flex flex-wrap items-end justify-center gap-3 md:gap-5">
      {pets.map((pet, index) => {
        const tilt = index % 2 === 0 ? "rotate-[-3deg]" : "rotate-[3deg]";
        const lift = index % 3 === 1 ? "translate-y-1" : "-translate-y-1";

        return (
          <Link
            key={pet.slug}
            href={`/pets/${pet.slug}`}
            aria-label={`Open ${pet.displayName}`}
            className={`group relative flex flex-col items-center rounded-2xl border border-white/70 bg-white/55 px-3 pt-3 pb-2 shadow-lg shadow-blue-900/10 backdrop-blur-md transition hover:-translate-y-1 hover:bg-white ${tilt} ${lift} dark:bg-stone-900/55 dark:hover:bg-stone-800`}
          >
            <PetSprite
              src={pet.spritesheetPath}
              cycleStates
              cycleIntervalMs={1500}
              scale={0.55}
              label={`${pet.displayName} animated`}
            />
            <span className="mt-1 font-mono text-[10px] tracking-[0.18em] text-stone-700 uppercase dark:text-stone-300">
              {pet.displayName}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
