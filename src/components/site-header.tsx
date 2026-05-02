"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Show } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  // Close menu on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="flex items-center justify-between gap-3">
        <PetdexLogo href="/" />

        <div className="hidden items-center gap-9 text-sm text-[#4f515c] md:flex">
          <Link href="/#gallery" className="transition hover:text-black">
            Gallery
          </Link>
          <Link href="/create" className="transition hover:text-black">
            Create
          </Link>
          <Show when="signed-in">
            <Link href="/my-pets" className="transition hover:text-black">
              My pets
            </Link>
          </Show>
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

        <div className="flex shrink-0 items-center gap-2">
          {hideSubmitCta ? null : (
            <SubmitCTA className="hidden h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85 md:inline-flex">
              Submit a pet
            </SubmitCTA>
          )}
          <AuthBadge />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/70 text-stone-700 transition hover:bg-white md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-[#f7f8ff]/95 backdrop-blur md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <PetdexLogo href="/" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-stone-700 transition hover:bg-stone-100"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-5 text-lg">
            <MobileLink href="/#gallery" onClick={() => setOpen(false)}>
              Gallery
            </MobileLink>
            <MobileLink href="/create" onClick={() => setOpen(false)}>
              Create
            </MobileLink>
            <Show when="signed-in">
              <MobileLink href="/my-pets" onClick={() => setOpen(false)}>
                My pets
              </MobileLink>
            </Show>
            <MobileLink href="/api/manifest" onClick={() => setOpen(false)}>
              Manifest
            </MobileLink>
            <a
              href="https://github.com/crafter-station/petdex"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl px-4 py-3 transition hover:bg-white"
              onClick={() => setOpen(false)}
            >
              <GithubIcon className="size-5" />
              GitHub
            </a>
            <a
              href="https://github.com/sponsors/Railly"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl px-4 py-3 text-rose-700 transition hover:bg-rose-50"
              onClick={() => setOpen(false)}
            >
              ♥ Sponsor
            </a>
          </nav>

          {!hideSubmitCta ? (
            <div className="mt-auto p-5">
              <SubmitCTA className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-base font-medium text-white transition hover:bg-black/85">
                Submit a pet
              </SubmitCTA>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-2xl px-4 py-3 text-stone-800 transition hover:bg-white"
    >
      {children}
    </Link>
  );
}
