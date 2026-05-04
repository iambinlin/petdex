"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";

import { AuthBadge } from "@/components/auth-badge";
import { GithubStarsLink } from "@/components/github-stars-link";
import { PetdexLogo } from "@/components/petdex-logo";
import { SubmitCTA } from "@/components/submit-cta";
import { ThemeToggle } from "@/components/theme-toggle";

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

        <div className="hidden items-center gap-7 text-sm text-[#4f515c] md:flex">
          <Link href="/#gallery" className="transition hover:text-black dark:hover:text-stone-100">
            Gallery
          </Link>
          <Link href="/create" className="transition hover:text-black dark:hover:text-stone-100">
            Create
          </Link>
          <Link href="/requests" className="transition hover:text-black dark:hover:text-stone-100">
            Requests
          </Link>
          <Link href="/about" className="transition hover:text-black dark:hover:text-stone-100">
            About
          </Link>
          <GithubStarsLink />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hideSubmitCta ? null : (
            <SubmitCTA className="hidden h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85 md:inline-flex dark:bg-stone-100 dark:hover:bg-stone-200">
              Submit a pet
            </SubmitCTA>
          )}
          <ThemeToggle />
          <AuthBadge />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/70 text-stone-700 transition hover:bg-white md:hidden dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-300 dark:hover:bg-stone-800"
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
              className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-stone-700 transition hover:bg-stone-100 dark:border-white/10 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
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
            <MobileLink href="/requests" onClick={() => setOpen(false)}>
              Requests
            </MobileLink>
            <MobileLink href="/about" onClick={() => setOpen(false)}>
              About
            </MobileLink>
            <GithubStarsLink
              size="mobile"
              className="rounded-2xl px-4 py-3 hover:bg-white dark:hover:bg-stone-800"
            />
          </nav>

          {!hideSubmitCta ? (
            <div className="mt-auto p-5">
              <SubmitCTA className="inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-6 text-base font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:hover:bg-stone-200">
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
      className="rounded-2xl px-4 py-3 text-stone-800 transition hover:bg-white dark:text-stone-200 dark:hover:bg-stone-800"
    >
      {children}
    </Link>
  );
}
