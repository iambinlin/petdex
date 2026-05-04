"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Loader2, Pencil, X } from "lucide-react";

type ApprovedPet = {
  slug: string;
  displayName: string;
};

// Inline editor used on /u/[handle] when the viewer owns the profile.
// Lighter than ProfileCard (which is the dashboard summary in /my-pets):
// here the surrounding hero already shows handle/avatar, so we only need
// the bio + pinned pet form. Optimistic — no admin re-approval.
export function ProfileInlineEditor({
  handle,
  initialBio,
  initialFeatured,
  approvedPets,
}: {
  handle: string;
  initialBio: string | null;
  initialFeatured: string | null;
  approvedPets: ApprovedPet[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(initialBio ?? "");
  const [featured, setFeatured] = useState(initialFeatured ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-3 text-xs font-medium text-white transition hover:bg-black/85"
      >
        <Pencil className="size-3.5" />
        Edit profile
      </button>

      {open ? (
        <div
          aria-modal
          role="dialog"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-tight">
                  Edit your profile
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Lives at petdex.crafter.run/u/{handle}. Changes go live
                  instantly — no admin review.
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
                  htmlFor="profile-inline-bio"
                  className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase"
                >
                  Bio
                </label>
                <textarea
                  id="profile-inline-bio"
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
                  htmlFor="profile-inline-featured"
                  className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase"
                >
                  Pinned pet
                </label>
                <select
                  id="profile-inline-featured"
                  value={featured}
                  onChange={(e) => setFeatured(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#5266ea] focus:outline-none"
                >
                  <option value="">— None —</option>
                  {approvedPets.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.displayName} ({p.slug})
                    </option>
                  ))}
                </select>
                {approvedPets.length === 0 ? (
                  <p className="mt-1 font-mono text-[10px] text-stone-400">
                    Once a pet is approved you can pin it here. Tip: each
                    pet card below has a Pin button too.
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-[10px] text-stone-400">
                    Tip: each pet card below has a one-click Pin button.
                  </p>
                )}
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
    </>
  );
}
