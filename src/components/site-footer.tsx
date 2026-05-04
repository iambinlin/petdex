import Link from "next/link";

import { SponsorButton } from "@/components/sponsor-button";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
      <div className="flex flex-col items-start justify-between gap-3 border-t border-border-base pt-6 text-xs text-muted-3 md:flex-row md:items-center">
        <p>
          Pets are user-submitted fan art. Petdex does not claim rights to any
          underlying IP.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/leaderboard"
            className="underline underline-offset-4 transition hover:text-foreground"
          >
            Top creators
          </Link>
          <Link
            href="/legal/takedown"
            className="underline underline-offset-4 transition hover:text-foreground"
          >
            Takedown
          </Link>
          <a
            href="https://github.com/crafter-station/petdex"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition hover:text-foreground"
          >
            GitHub
          </a>
          <SponsorButton variant="inline" />
        </div>
      </div>
    </footer>
  );
}
