import Link from "next/link";

import { ArrowRight, Search, Sparkles } from "lucide-react";

import { CommandLine } from "@/components/command-line";
import { PetSprite } from "@/components/pet-sprite";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getApprovedPetCount, getFeaturedPetsWithMetrics } from "@/lib/pets";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pet not found",
  description: "This pet wandered off the index. Try one of these instead.",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const [featured, total] = await Promise.all([
    getFeaturedPetsWithMetrics(4),
    getApprovedPetCount(),
  ]);

  // Pick a random featured pet for the "lost" sprite. Falls back gracefully
  // if the curated set is empty (early days / fresh DB).
  const lost =
    featured[Math.floor(Math.random() * featured.length)] ?? null;

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505] dark:bg-stone-950">
      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />

          <div className="mt-10 flex flex-col items-center text-center md:mt-14">
            <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
              Error 404
            </p>
            <h1 className="mt-3 text-balance text-[42px] leading-[1] font-semibold tracking-tight md:text-[64px]">
              This pet wandered off
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base leading-7 text-[#202127] md:text-lg">
              The page you tried to reach isn't in the index. Could be a typo,
              a withdrawn submission, or a pet that hasn't been approved yet.
              Try one of these instead.
            </p>

            {lost ? (
              <div className="relative mt-10 flex flex-col items-center gap-3">
                <div
                  className="relative flex items-center justify-center rounded-3xl border border-[#6478f6]/25 bg-white/82 px-10 py-8 shadow-[0_0_0_1px_rgba(100,120,246,0.10),0_24px_60px_-30px_rgba(82,102,234,0.45)] backdrop-blur"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95) 0%, rgba(238,241,255,0.55) 60%, transparent 90%)",
                  }}
                >
                  <PetSprite
                    src={lost.spritesheetPath}
                    cycleStates
                    cycleIntervalMs={1400}
                    scale={0.8}
                    label={`${lost.displayName} cycling through states`}
                  />
                </div>
                <p className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase dark:text-stone-400">
                  Caught wandering: {lost.displayName}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/#gallery"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:hover:bg-stone-200"
            >
              <Search className="size-4" />
              Browse {total > 0 ? `${total}+ pets` : "the gallery"}
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 text-sm font-medium text-black backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              <Sparkles className="size-4" />
              About Petdex
            </Link>
            <Link
              href="/submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-6 text-sm font-medium text-black backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              Submit a pet
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-12 md:px-8 md:py-16">
          <header className="flex flex-col gap-1">
            <p className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase dark:text-stone-400">
              Try a featured one
            </p>
            <h2 className="text-2xl font-medium tracking-tight text-stone-950 md:text-3xl dark:text-stone-100">
              Pets that are definitely here
            </h2>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((pet) => (
              <Link
                key={pet.slug}
                href={`/pets/${pet.slug}`}
                className="group flex flex-col items-center rounded-3xl border border-black/10 bg-white/76 px-5 py-6 shadow-sm shadow-blue-950/5 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-blue-950/10 dark:border-white/10 dark:bg-stone-900/76 dark:hover:bg-stone-800"
              >
                <div
                  className="flex items-center justify-center px-2 py-3"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95) 0%, rgba(238,241,255,0.55) 55%, transparent 80%)",
                  }}
                >
                  <PetSprite
                    src={pet.spritesheetPath}
                    cycleStates
                    scale={0.6}
                    label={`${pet.displayName} animated`}
                  />
                </div>
                <span className="mt-3 text-base font-semibold tracking-tight text-stone-950 dark:text-stone-100">
                  {pet.displayName}
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-stone-400 uppercase dark:text-stone-500">
                  {pet.kind}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-2 rounded-2xl border border-black/[0.08] bg-white/55 px-5 py-4 backdrop-blur dark:border-white/[0.08] dark:bg-stone-900/55">
            <p className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase dark:text-stone-400">
              Or install one from the terminal
            </p>
            <CommandLine
              command={`npx petdex install ${lost?.slug ?? "boba"}`}
              source="not-found"
              className="mt-3"
            />
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
