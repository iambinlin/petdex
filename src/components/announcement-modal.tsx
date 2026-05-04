"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { track } from "@vercel/analytics";
import { ArrowRight, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "petdex_announce_vibe_search_v1";

// One-time modal announcing the new semantic search + request flow.
// Soft entrance: 1.5s after first paint, dismissable, never reappears once
// the user closes or clicks the CTA. The onboarding tour already runs on
// first visit so we skip this modal if the tour hasn't been seen yet — we
// don't want two layers of intro pop-ups stacked.
export function AnnouncementModal() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    // Don't compete with the onboarding tour. If it's still active for
    // this user (no `petdex_tour_seen_v1` flag), wait. Once the tour
    // marks itself seen, this modal will surface on the next visit.
    if (window.localStorage.getItem("petdex_tour_seen_v1") !== "1") return;

    const t = window.setTimeout(() => {
      setOpen(true);
      track("announcement_shown", { announcement: "vibe_search" });
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  function close(reason: "dismiss" | "cta_search" | "cta_requests" = "dismiss") {
    track("announcement_closed", {
      announcement: "vibe_search",
      reason,
    });
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      window.localStorage.setItem(STORAGE_KEY, "1");
    }, 220);
  }

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center px-4 pb-4 sm:items-center sm:p-6 ${
        closing ? "pointer-events-none" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Petdex new feature announcement"
    >
      {/* Subtle backdrop — dismisses on click but doesn't dim heavily so the
          modal feels like a soft FYI, not a blocker. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => close("dismiss")}
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
      />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_80px_-20px_rgba(56,71,245,0.45)] transition-all duration-200 ${
          closing ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {/* Hero image */}
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-br from-[#d8e9ff] via-[#f7f8ff] to-[#c9c6ff]">
          {/* biome-ignore lint/performance/noImgElement: AI-generated marketing illustration */}
          <img
            src="/announcements/vibe-search.webp"
            alt=""
            className="size-full object-cover"
          />
          <button
            type="button"
            onClick={() => close("dismiss")}
            aria-label="Close"
            className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-white hover:text-black"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[#5266ea] text-white">
              <Sparkles className="size-3" />
            </span>
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#5266ea] uppercase">
              New · Vibe search
            </p>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-950">
            Search by what a pet feels like
          </h2>
          <p className="text-sm leading-6 text-stone-600">
            Type{" "}
            <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-900">
              cozy night programmer
            </span>{" "}
            or{" "}
            <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-900">
              fierce dragon
            </span>{" "}
            and Petdex finds the closest matches by vibe — not just keyword.
          </p>
          <p className="text-sm leading-6 text-stone-600">
            Doesn't find what you wanted?{" "}
            <strong className="text-stone-900">Request the pet</strong> and the
            community can upvote it. Most-asked land in the queue first.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/#gallery"
              onClick={() => close("cta_search")}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/85"
            >
              Try the search
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/requests"
              onClick={() => close("cta_requests")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-stone-700 transition hover:border-black/30"
            >
              See requests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
