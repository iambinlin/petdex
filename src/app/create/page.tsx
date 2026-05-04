import Link from "next/link";

import { ArrowRight, Hammer, Package, Settings, Upload } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Create a pet — Petdex",
  description:
    "Hatch your own Codex pet in 5 minutes, then share it on Petdex.",
  openGraph: {
    title: "Create a pet — Petdex",
    description:
      "Hatch your own Codex pet in 5 minutes, then share it on Petdex.",
    images: ["/og.png"],
  },
};

export default function CreatePage() {
  return (
    <main className="petdex-cloud relative min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-5 pb-12 md:px-8 md:py-5 md:pb-16">
        <SiteHeader />

        <header className="mt-6 max-w-3xl">
          <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
            Make your own
          </p>
          <h1 className="mt-3 text-5xl leading-tight font-medium tracking-tight md:text-7xl">
            Hatch a pet in Codex
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-2">
            Codex ships a built-in skill called{" "}
            <strong>Hatch Pet</strong> that generates a fully animated
            companion (9 states, 1536×1872) from a short description. Five
            minutes from idea to a sprite that lives in your editor.
          </p>
        </header>

        <ol className="grid gap-4 md:grid-cols-2">
          <Step
            n={1}
            icon={<Package className="size-4" />}
            title="Get the Hatch Pet skill"
          >
            <p>
              Open Codex →{" "}
              <span className="font-mono">Skills</span> in the top navbar →
              find <strong>Hatch Pet</strong> → install.
            </p>
          </Step>

          <Step
            n={2}
            icon={<Hammer className="size-4" />}
            title="Hatch your pet"
          >
            <p>
              In Codex chat, type{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs dark:bg-stone-800">
                /pet
              </code>
              . Describe the pet you want (an idea, a vibe, a thing on your
              desk). The skill generates the spritesheet and animations
              automatically.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Tip: specifics travel further. "A tiny sock-elf with green eyes"
              beats "a creature".
            </p>
          </Step>

          <Step
            n={3}
            icon={<Settings className="size-4" />}
            title="Activate it"
          >
            <p>
              Restart Codex, then go to{" "}
              <span className="font-mono">
                Settings → Appearance → Pets
              </span>{" "}
              and click <strong>Select</strong> on your new pet under{" "}
              <span className="font-mono">Custom pets</span>.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Use{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs dark:bg-stone-800">
                /pet
              </code>{" "}
              afterwards to wake or tuck it away.
            </p>
          </Step>

          <Step
            n={4}
            icon={<Upload className="size-4" />}
            title="Share it on Petdex"
          >
            <p>
              The pet lives at{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs dark:bg-stone-800">
                ~/.codex/pets/&lt;name&gt;
              </code>
              . Drag that folder (or its zip) to{" "}
              <Link
                href="/submit"
                className="font-medium underline underline-offset-4 hover:text-black dark:hover:text-stone-100"
              >
                /submit
              </Link>{" "}
              and Petdex hosts it for everyone to install with one curl.
            </p>
          </Step>
        </ol>

        <div className="rounded-3xl border border-black/10 bg-white/76 p-6 backdrop-blur md:p-8 dark:border-white/10 dark:bg-stone-900/76">
          <h2 className="text-lg font-semibold tracking-tight">
            What makes a great pet
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700 dark:text-stone-300">
            <li>
              <strong>Specific over generic.</strong> "A bubble-tea otter"
              beats "an otter".
            </li>
            <li>
              <strong>Twist a job, role, or object.</strong> Paperclip
              assistant, sock elf, microwave companion — the unexpected sticks.
            </li>
            <li>
              <strong>One vibe.</strong> Cozy, focused, mischievous, heroic.
              Don't try to be all of them.
            </li>
            <li>
              <strong>Skip clear IP.</strong> Fan-art is welcome but expect
              takedowns. Original concepts age better.
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white/85 p-6 backdrop-blur dark:border-white/10">
          <div>
            <p className="text-base font-semibold text-stone-950 dark:text-stone-100">
              Already have a pet?
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Drop the folder or zip and we'll publish it.
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:hover:bg-stone-200"
          >
            Submit your pet
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-3xl border border-black/10 bg-white/76 p-5 backdrop-blur dark:border-white/10 dark:bg-stone-900/76">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-black font-mono text-[11px] text-white dark:bg-stone-100">
          {n}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight text-stone-950 dark:text-stone-100">
          {icon}
          {title}
        </span>
      </div>
      <div className="space-y-2 text-sm leading-6 text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </li>
  );
}
