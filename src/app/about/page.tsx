import Link from "next/link";

import { CommandLine } from "@/components/command-line";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getApprovedPetCount } from "@/lib/pets";

const SITE_URL = "https://petdex.crafter.run";

export const revalidate = 3600;

export const metadata = {
  title: "About Petdex — Animated pet companions for the Codex CLI",
  description:
    "Petdex is an open-source gallery of animated pixel pets for the OpenAI Codex CLI. Browse the catalog, install with one command, or submit your own.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Petdex",
    description:
      "An open-source gallery of animated pixel pets for the OpenAI Codex CLI.",
    url: `${SITE_URL}/about`,
    type: "website",
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a Codex pet?",
    a: "A Codex pet is a small animated pixel companion that lives inside the Codex CLI. Each pet ships as a single pet.json describing 9 states (idle, working, sleeping, etc.) plus a horizontal spritesheet. Codex picks the right state automatically based on what you're doing in the terminal.",
  },
  {
    q: "How do I install a pet?",
    a: "From the gallery page or any pet detail page, copy the install command (looks like `npx petdex install boba`) and paste it into your terminal. The CLI fetches the pet from R2, drops it under ~/.codex/pets/<slug>/, and tells Codex to use it. Works on macOS, Linux, and Windows (via PowerShell).",
  },
  {
    q: "Where do the pets come from?",
    a: "Most pets are submitted by the community through the website or the petdex CLI. A handful are featured curated entries hand-picked from Crafter Station. Every pet is reviewed by an admin before it goes live in the gallery.",
  },
  {
    q: "Can I submit my own pet?",
    a: "Yes. Sign in with the petdex CLI (npx petdex login) and run `npx petdex submit ./my-pet/` — the CLI uploads the assets to R2 and queues the submission for review. You can also submit through the website at /submit. All you need is a pet.json file and a 9-state spritesheet.",
  },
  {
    q: "Are Petdex pets free and open source?",
    a: "Every pet on Petdex is free to install and use. Pets keep credit to their original authors. The Petdex platform itself (CLI + site) is open source under the Crafter Station umbrella.",
  },
  {
    q: "What's a vibe? What's a kind?",
    a: "Each pet is tagged with a kind (creature, object, character) and one to three vibes (cozy, playful, focused, mystical, …). These power the gallery filters and the per-vibe / per-kind landing pages so you can find a companion that matches your mood without scrolling 70+ entries.",
  },
  {
    q: "How does Petdex make money?",
    a: "It doesn't. Petdex is a community project run by Crafter Station. Storage and DB are absorbed by the platform team — no ads, no upsells, no telemetry beyond standard analytics on which pets get installed.",
  },
];

export default async function AboutPage() {
  const totalPets = await getApprovedPetCount();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Petdex",
      url: `${SITE_URL}/about`,
      description:
        "Petdex is an open-source gallery of animated pixel pets for the OpenAI Codex CLI.",
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <JsonLd data={jsonLd} />
      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />
          <div className="mt-12 flex flex-col items-center text-center md:mt-16">
            <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
              About
            </p>
            <h1 className="mt-3 text-balance text-[40px] leading-[1] font-semibold tracking-tight md:text-[64px]">
              Petdex is the index of Codex pets
            </h1>
            <p className="mt-5 max-w-2xl text-balance text-base leading-7 text-[#202127] md:text-lg">
              An open-source gallery of {totalPets}+ animated pixel companions
              for the <strong>Codex CLI</strong>. Install one with a single
              command, animate your terminal, and ship code with company.
            </p>
            <CommandLine
              command="npx petdex install boba"
              source="about-hero"
              className="mt-5 w-full max-w-sm"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 py-14 md:px-8 md:py-20">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
            What Petdex is
          </h2>
          <p className="text-base leading-7 text-stone-700 md:text-lg">
            Petdex is a public, open-source registry. Every entry is a pet
            pack — a tiny bundle of metadata and pixel art that the Codex CLI
            knows how to display while you work. Think of it as a Pokédex for
            terminal companions.
          </p>
          <p className="text-base leading-7 text-stone-700 md:text-lg">
            The platform takes the guesswork out: there's a CLI for installing
            and submitting, a tagged gallery so finding the right companion
            doesn't require scrolling, and per-vibe collections like{" "}
            <Link
              href="/vibe/cozy"
              className="text-[#5266ea] underline-offset-2 hover:underline"
            >
              cozy pets
            </Link>{" "}
            or{" "}
            <Link
              href="/vibe/focused"
              className="text-[#5266ea] underline-offset-2 hover:underline"
            >
              focused pets
            </Link>
            .
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
            How a pet pack works
          </h2>
          <p className="text-base leading-7 text-stone-700 md:text-lg">
            Each pet is two files. <code className="rounded bg-[#eef1ff] px-1 py-0.5 text-[#5266ea]">pet.json</code>{" "}
            defines the metadata — name, the 9 animation states, frame durations
            — and{" "}
            <code className="rounded bg-[#eef1ff] px-1 py-0.5 text-[#5266ea]">spritesheet.webp</code>{" "}
            holds the pixel art as a horizontal strip. Codex loads them at
            startup and swaps states based on what's happening in your session.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
            FAQ
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <article key={item.q} className="space-y-2">
                <h3 className="text-lg font-semibold text-stone-950">
                  {item.q}
                </h3>
                <p className="text-base leading-7 text-stone-700">{item.a}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">
            Browse by kind or vibe
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              ["Creatures", "/kind/creature"],
              ["Objects", "/kind/object"],
              ["Characters", "/kind/character"],
              ["Cozy", "/vibe/cozy"],
              ["Playful", "/vibe/playful"],
              ["Focused", "/vibe/focused"],
              ["Mystical", "/vibe/mystical"],
              ["Wholesome", "/vibe/wholesome"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-9 items-center rounded-full border border-black/10 bg-white px-3 text-sm text-stone-700 transition hover:border-black/30"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
