"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@vercel/analytics";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MoreHorizontal,
  Terminal,
  X as CloseIcon,
} from "lucide-react";

const SITE_URL = "https://petdex.crafter.run";

export type PetActionMenuPet = {
  slug: string;
  displayName: string;
  zipUrl?: string | null;
  description?: string;
};

type Variant = "card" | "detail";

type Props = {
  pet: PetActionMenuPet;
  variant?: Variant;
};

export function PetActionMenu({ pet, variant = "card" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"install" | "link" | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const installCmd = `npx petdex install ${pet.slug}`;
  const pageUrl = `${SITE_URL}/pets/${pet.slug}`;

  // Click outside / Esc closes the menu.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const copyText = useCallback(
    async (text: string, kind: "install" | "link") => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        track("pet_action_copy", { slug: pet.slug, kind });
        window.setTimeout(() => setCopied(null), 1400);
      } catch {
        // ignore clipboard failures (Safari permission issues etc.)
      }
    },
    [pet.slug],
  );

  const onShareX = useCallback(() => {
    const text = `${pet.displayName} — an animated Codex pet on Petdex.\n\n${installCmd}`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    track("pet_action_share", { slug: pet.slug, target: "x" });
    window.open(url, "_blank", "noopener,noreferrer,width=560,height=540");
    setOpen(false);
  }, [pet.slug, pet.displayName, installCmd, pageUrl]);

  const onShareLinkedIn = useCallback(() => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
    track("pet_action_share", { slug: pet.slug, target: "linkedin" });
    window.open(url, "_blank", "noopener,noreferrer,width=620,height=600");
    setOpen(false);
  }, [pet.slug, pageUrl]);

  const onShareNative = useCallback(async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) return;
    try {
      await (
        navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }
      ).share({
        title: `${pet.displayName} — Petdex`,
        text: `${pet.displayName} — an animated Codex pet`,
        url: pageUrl,
      });
      track("pet_action_share", { slug: pet.slug, target: "native" });
      setOpen(false);
    } catch {
      // user cancelled, ignore
    }
  }, [pet.slug, pet.displayName, pageUrl]);

  const onZipClick = useCallback(() => {
    track("zip_downloaded", { slug: pet.slug, source: "menu" });
    void fetch(`/api/pets/${pet.slug}/track-zip`, { method: "POST" }).catch(
      () => {},
    );
    setOpen(false);
  }, [pet.slug]);

  // Detail variant: bigger trigger that reads as an action button next to
  // the like button. Card variant: compact circular icon in a corner.
  const triggerClassName =
    variant === "detail"
      ? "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-stone-700 transition hover:border-black/30"
      : "inline-flex size-8 items-center justify-center rounded-full border border-black/10 bg-white/90 text-stone-600 transition hover:border-black/30 hover:text-black";

  // Detail menu opens downward, card menu opens upward (cards live in the
  // grid with little space below).
  const menuPositionClassName =
    variant === "detail"
      ? "absolute right-0 top-full mt-2"
      : "absolute right-0 bottom-full mb-2";

  return (
    <div
      ref={ref}
      className={
        variant === "card"
          ? "relative"
          : "relative inline-flex"
      }
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Stop card-level navigation when this lives inside an <a> wrapper.
        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${pet.displayName}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={triggerClassName}
      >
        {variant === "detail" ? (
          <>
            <MoreHorizontal className="size-4" />
            Share
          </>
        ) : (
          <MoreHorizontal className="size-4" />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className={`${menuPositionClassName} z-30 w-60 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl shadow-blue-950/15`}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
              {pet.displayName}
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className="grid size-6 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>

          <ul className="py-1">
            <MenuItem
              icon={
                copied === "install" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Terminal className="size-4" />
                )
              }
              label={copied === "install" ? "Copied install" : "Copy install"}
              hint={installCmd}
              onClick={() => copyText(installCmd, "install")}
            />
            <MenuItem
              icon={
                copied === "link" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Link2 className="size-4" />
                )
              }
              label={copied === "link" ? "Copied link" : "Copy page link"}
              hint={pageUrl.replace(/^https?:\/\//, "")}
              onClick={() => copyText(pageUrl, "link")}
            />
            <MenuItem
              icon={<XIcon className="size-4" />}
              label="Share to X"
              onClick={onShareX}
            />
            <MenuItem
              icon={<LinkedInIcon className="size-4" />}
              label="Share to LinkedIn"
              onClick={onShareLinkedIn}
            />
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <MenuItem
                icon={<ExternalLink className="size-4" />}
                label="More…"
                onClick={onShareNative}
              />
            ) : null}
            {pet.zipUrl ? (
              <li>
                <a
                  href={pet.zipUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  onClick={onZipClick}
                  className="flex items-center gap-2.5 border-t border-black/[0.06] px-3 py-2.5 text-sm text-stone-700 transition hover:bg-[#f4f6ff] hover:text-black"
                >
                  <Download className="size-4" />
                  <span className="flex-1">Download ZIP</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
};

function MenuItem({ icon, label, hint, onClick }: MenuItemProps) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-[#f4f6ff] hover:text-black"
      >
        {icon}
        <span className="flex flex-col">
          <span>{label}</span>
          {hint ? (
            <span className="font-mono text-[10px] tracking-tight text-stone-400">
              {hint}
            </span>
          ) : null}
        </span>
        {label.startsWith("Copy") ? (
          <Copy className="ml-auto size-3.5 text-stone-300" />
        ) : null}
      </button>
    </li>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2H21l-6.55 7.49L22 22h-6.93l-4.83-6.31L4.6 22H1.84l7.01-8.02L1 2h7.07l4.36 5.78L18.244 2zm-2.43 18h1.91L7.27 4H5.27l10.544 16z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.34 18.34V10.5H5.67v7.84zm-1.34-9a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9v-4.49c0-2.4-1.28-3.52-2.99-3.52a2.58 2.58 0 0 0-2.34 1.29h-.04V10.5h-2.55v7.84h2.66v-3.88c0-1.02.2-2.01 1.46-2.01 1.25 0 1.27 1.17 1.27 2.07v3.82z" />
    </svg>
  );
}
