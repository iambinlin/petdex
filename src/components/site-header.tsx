import Link from "next/link";

import { AuthBadge } from "@/components/auth-badge";
import { GithubIcon } from "@/components/github-icon";
import { PetdexLogo } from "@/components/petdex-logo";
import { SponsorButton } from "@/components/sponsor-button";
import { SubmitCTA } from "@/components/submit-cta";

type SiteHeaderProps = {
  /** When true, hide the primary "Submit a pet" CTA (e.g. on /submit itself). */
  hideSubmitCta?: boolean;
};

export function SiteHeader({ hideSubmitCta = false }: SiteHeaderProps) {
  return (
    <nav className="flex items-center justify-between gap-4">
      <PetdexLogo href="/" />
      <div className="hidden items-center gap-9 text-sm text-[#4f515c] md:flex">
        <Link href="/#gallery" className="transition hover:text-black">
          Gallery
        </Link>
        <SubmitCTA className="transition hover:text-black">Submit</SubmitCTA>
        <Link href="/create" className="transition hover:text-black">
          Create
        </Link>
        <a href="/api/manifest" className="transition hover:text-black">
          Manifest
        </a>
        <a
          href="https://github.com/crafter-station/petdex"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 transition hover:text-black"
        >
          <GithubIcon className="size-4" />
          GitHub
        </a>
        <SponsorButton variant="nav" />
      </div>
      <div className="flex items-center gap-3">
        {hideSubmitCta ? null : <SubmitCTA />}
        <AuthBadge />
      </div>
    </nav>
  );
}
