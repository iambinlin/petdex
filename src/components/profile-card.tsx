"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { ExternalLink, Loader2, Pencil, Star, X } from "lucide-react";

type ApprovedPet = {
  slug: string;
  displayName: string;
  spritesheetUrl: string;
};

export type ProfileData = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  featuredPetSlug: string | null;
  approvedPets: ApprovedPet[];
};

export function ProfileCard({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [featured, setFeatured] = useState(profile.featuredPetSlug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setBio(profile.bio ?? "");
      setFeatured(profile.featuredPetSlug ?? "");
      setError(null);
    }
  }, [open, profile.bio, profile.featuredPetSlug]);

  // Honor /my-pets#profile by auto-opening the editor.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#profile") {
      setOpen(true);
      // Clear so a refresh doesn't re-open.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          featuredPetSlug: featured || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(j?.error ?? res.statusText);
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const fallbackInitial = (
    profile.displayName ??
    profile.handle ??
    "?"
  )
    .slice(0, 1)
    .toUpperCase();

  return (
    <section
      id="profile"
      className="rounded-3xl border border-black/10 bg-white/76 p-5 backdrop-blur md:p-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        {profile.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: Clerk avatar
          <img
            src={profile.avatarUrl}
            alt=""
            className="size-14 shrink-0 rounded-2xl ring-1 ring-black/10"
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-stone-100 font-mono text-base font-semibold text-stone-700 ring-1 ring-black/10">
            {fallbackInitial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#5266ea] uppercase">
            Public profile
          </p>
          <p className="mt-1 truncate text-base font-medium text-stone-950">
            {profile.displayName ?? `@${profile.handle}`}
          </p>
          <p className="font-mono text-[11px] tracking-[0.06em] text-stone-500">
            petdex.crafter.run/u/{profile.handle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/u/${profile.handle}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-stone-700 transition hover:border-black/30"
          >
            <ExternalLink className="size-3.5" />
            View public
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-medium text-white transition hover:bg-black/85"
          >
            <Pencil className="size-3.5" />
            Customize
          </button>
        </div>
      </div>

      {profile.bio || profile.featuredPetSlug ? (
        <div className="mt-4 grid gap-3 border-t border-black/[0.06] pt-4 md:grid-cols-2">
          {profile.bio ? (
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
                Bio
              </p>
              <p className="mt-1.5 text-sm leading-6 text-stone-700">
                {profile.bio}
              </p>
            </div>
          ) : null}
          {profile.featuredPetSlug ? (
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
                Pinned pet
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-stone-700">
                <Star className="size-3.5 text-[#5266ea]" />
                {profile.approvedPets.find(
                  (p) => p.slug === profile.featuredPetSlug,
                )?.displayName ?? profile.featuredPetSlug}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-black/10 bg-[#eef1ff]/40 p-3 text-xs text-stone-600">
          Add a bio and pin your favorite pet so visitors land somewhere
          opinionated. Hit{" "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-[#5266ea] underline-offset-2 hover:underline"
          >
            Customize
          </button>{" "}
          to set it up.
        </div>
      )}

      {open ? (
        <div
          aria-modal
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Customize profile
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Lives at petdex.crafter.run/u/{profile.handle}. No admin
                  review — your changes go live instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="profile-bio"
                  className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase"
                >
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                  rows={4}
                  placeholder="Pixel art, cozy creatures, and the occasional shrimp."
                  className="mt-1 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#5266ea] focus:outline-none"
                />
                <p className="mt-1 font-mono text-[10px] text-stone-400">
                  {bio.length}/280
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-featured"
                  className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase"
                >
                  Pinned pet
                </label>
                <select
                  id="profile-featured"
                  value={featured}
                  onChange={(e) => setFeatured(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#5266ea] focus:outline-none"
                >
                  <option value="">— None —</option>
                  {profile.approvedPets.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.displayName} ({p.slug})
                    </option>
                  ))}
                </select>
                {profile.approvedPets.length === 0 ? (
                  <p className="mt-1 font-mono text-[10px] text-stone-400">
                    Once a pet is approved you can pin it here.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-900">
                  {error.replace(/_/g, " ")}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 items-center rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-stone-700 transition hover:border-black/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
