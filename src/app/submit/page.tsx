import Link from "next/link";

import { ArrowRight, Hammer } from "lucide-react";

import { PetSubmitForm } from "@/components/pet-submit-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Submit a pet — Petdex",
  description: "Upload and validate a Codex pet package for Petdex.",
};

export default function SubmitPage() {
  return (
    <main className="petdex-cloud relative min-h-screen overflow-hidden bg-background">
      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-5 pb-12 md:px-8 md:py-5 md:pb-16">
        <SiteHeader hideSubmitCta />

        <header className="max-w-3xl">
          <p className="text-sm font-medium text-brand-light">Submit</p>
          <h1 className="mt-4 text-5xl leading-tight font-medium tracking-normal text-black md:text-7xl dark:text-stone-100">
            Add your pet to Petdex
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-2">
            Share a Codex-compatible animated pet package. Petdex checks the
            files locally, previews the sprite, and prepares the submission.
          </p>
          <Link
            href="/create"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 backdrop-blur transition hover:bg-white hover:text-black dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <Hammer className="size-4" />
            Don't have a pet yet? Hatch one in Codex
            <ArrowRight className="size-4" />
          </Link>
        </header>

        <PetSubmitForm />

        <p className="max-w-3xl text-xs leading-5 text-stone-500 dark:text-stone-400">
          By submitting, you confirm you have rights to the artwork or are
          creating fan content. Rights holders can request removal via our{" "}
          <Link
            href="/legal/takedown"
            className="underline underline-offset-4 hover:text-black dark:hover:text-stone-100"
          >
            takedown notice
          </Link>
          .
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
