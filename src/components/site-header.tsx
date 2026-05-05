"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Menu, MoreHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { withLocale } from "@/lib/locale-routing";

import { AuthBadge } from "@/components/auth-badge";
import { DiscordLink } from "@/components/discord-link";
import { GithubStarsLink } from "@/components/github-stars-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PetdexLogo } from "@/components/petdex-logo";
import { SubmitCTA } from "@/components/submit-cta";
import { ThemeToggle } from "@/components/theme-toggle";

import { hasLocale, type Locale } from "@/i18n/config";

type SiteHeaderProps = {
  /** When true, hide the primary "Submit a pet" CTA (e.g. on /submit itself). */
  hideSubmitCta?: boolean;
};

export function SiteHeader({ hideSubmitCta = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const currentLocale: Locale = hasLocale(locale) ? locale : "en";
  const t = useTranslations("header");
  const common = useTranslations("common");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  function href(pathname: string) {
    return withLocale(pathname, currentLocale);
  }

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

  useEffect(() => {
    if (!settingsOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  return (
    <>
      <nav className="flex items-center justify-between gap-3">
        <PetdexLogo href={href("/")} ariaLabel={common("petdexHome")} />

        <div className="hidden items-center gap-4 text-sm text-muted-2 lg:flex">
          <Link
            href={href("/create")}
            className="transition hover:text-foreground"
          >
            {t("create")}
          </Link>
          <Link
            href={href("/collections")}
            className="transition hover:text-foreground"
          >
            {t("collections")}
          </Link>
          <Link
            href={href("/leaderboard")}
            className="transition hover:text-foreground"
          >
            {t("creators")}
          </Link>
          <Link
            href={href("/requests")}
            className="transition hover:text-foreground"
          >
            {t("requests")}
          </Link>
          {process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ? (
            <DiscordLink
              href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
              source="header"
              className="inline-flex items-center gap-1.5 transition hover:text-foreground"
            >
              {t("discord")}
              <span className="rounded-full bg-brand-tint px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] text-brand uppercase ring-1 ring-brand/30 dark:bg-brand-tint-dark">
                new
              </span>
            </DiscordLink>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hideSubmitCta ? null : (
            <SubmitCTA
              href={href("/submit")}
              className="hidden h-11 items-center justify-center rounded-full bg-inverse px-4 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover md:inline-flex"
            >
              {t("submitCta")}
            </SubmitCTA>
          )}
          <GithubStarsLink className="hidden h-11 items-center rounded-full border border-border-base bg-surface/70 px-3 text-muted-2 backdrop-blur hover:bg-surface md:inline-flex" />
          <button
            type="button"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full border border-border-base bg-surface/70 text-muted-2 transition hover:bg-surface lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <AuthBadge
            beforeUser={
              <div ref={settingsRef} className="relative hidden md:block">
                <button
                  type="button"
                  aria-label={t("settings")}
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((value) => !value)}
                  className="grid size-11 place-items-center rounded-full border border-border-base bg-surface/70 text-muted-2 backdrop-blur transition hover:bg-surface hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {settingsOpen ? (
                  <HeaderSettingsMenu
                    href={href}
                    onNavigate={() => setSettingsOpen(false)}
                  />
                ) : null}
              </div>
            }
          />
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <PetdexLogo href={href("/")} ariaLabel={common("petdexHome")} />
            <button
              type="button"
              aria-label={t("closeMenu")}
              onClick={() => setOpen(false)}
              className="grid size-11 place-items-center rounded-full border border-border-base bg-surface text-muted-2 transition hover:bg-surface-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-5 text-lg">
            <MobileLink href={href("/create")} onClick={() => setOpen(false)}>
              {t("create")}
            </MobileLink>
            <MobileLink href={href("/docs")} onClick={() => setOpen(false)}>
              {t("docs")}
            </MobileLink>
            <MobileLink
              href={href("/collections")}
              onClick={() => setOpen(false)}
            >
              {t("collections")}
            </MobileLink>
            <MobileLink
              href={href("/leaderboard")}
              onClick={() => setOpen(false)}
            >
              {t("creators")}
            </MobileLink>
            <MobileLink href={href("/requests")} onClick={() => setOpen(false)}>
              {t("requests")}
            </MobileLink>
            {process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ? (
              <DiscordLink
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL}
                source="header_mobile"
                className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-foreground hover:bg-surface-muted"
              >
                {t("discord")}
                <span className="rounded-full bg-brand px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] text-on-brand uppercase">
                  new
                </span>
              </DiscordLink>
            ) : null}
            <MobileLink href={href("/about")} onClick={() => setOpen(false)}>
              {t("about")}
            </MobileLink>
            <GithubStarsLink
              size="mobile"
              className="rounded-2xl px-4 py-3 hover:bg-surface-muted"
            />
          </nav>
          <div className="mx-5 mt-5 rounded-2xl border border-border-base bg-surface/70 p-3">
            <p className="px-1 pb-2 font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
              {t("settings")}
            </p>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
          </div>

          {!hideSubmitCta ? (
            <div className="mt-auto p-5">
              <SubmitCTA
                href={href("/submit")}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-inverse px-6 text-base font-medium text-on-inverse transition hover:bg-inverse-hover"
              >
                {t("submitCta")}
              </SubmitCTA>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function HeaderSettingsMenu({
  href,
  onNavigate,
}: {
  href: (pathname: string) => string;
  onNavigate: () => void;
}) {
  const t = useTranslations("header");

  return (
    <div className="absolute top-full right-0 z-[70] mt-2 w-64 rounded-2xl border border-border-base bg-surface p-2 shadow-xl shadow-blue-950/15">
      <div className="grid gap-1">
        <SettingsLink href={href("/docs")} onClick={onNavigate}>
          {t("docs")}
        </SettingsLink>
        <SettingsLink href={href("/about")} onClick={onNavigate}>
          {t("about")}
        </SettingsLink>
      </div>
      <div className="mt-2 border-t border-border-base pt-2">
        <p className="px-2 pb-2 font-mono text-[10px] tracking-[0.18em] text-muted-3 uppercase">
          {t("settings")}
        </p>
        <div className="flex items-center gap-2 px-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}

function SettingsLink({
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
      className="rounded-xl px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
    >
      {children}
    </Link>
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
      className="rounded-2xl px-4 py-3 text-foreground transition hover:bg-white dark:hover:bg-stone-800"
    >
      {children}
    </Link>
  );
}
