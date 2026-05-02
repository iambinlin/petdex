"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Pencil,
  Slash,
  X,
} from "lucide-react";

import type { SubmittedPet } from "@/lib/db/schema";
import { petStates } from "@/lib/pet-states";

type AdminReviewRowProps = {
  pet: SubmittedPet;
  stateCount: number;
};

export function AdminReviewRow({ pet, stateCount }: AdminReviewRowProps) {
  const [status, setStatus] = useState(pet.status);
  const [displayName, setDisplayName] = useState(pet.displayName);
  const [description, setDescription] = useState(pet.description);
  const [slug, setSlug] = useState(pet.slug);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUntitled = pet.displayName === "Untitled pet";

  async function decide(action: "approve" | "reject") {
    if (busy) return;
    setBusy(true);
    setError(null);

    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (optional)") ?? "";
    }

    const res = await fetch(`/api/admin/${pet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason,
        // Persist any edits made before approve/reject too
        displayName,
        description,
        slug,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setError(data.message ?? data.error ?? `Request failed (${res.status})`);
      setBusy(false);
      return;
    }

    setStatus(action === "approve" ? "approved" : "rejected");
    setBusy(false);
  }

  async function saveEdit() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/${pet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "edit",
        displayName,
        description,
        slug,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setError(data.message ?? data.error ?? `Request failed (${res.status})`);
      setBusy(false);
      return;
    }

    setEditing(false);
    setBusy(false);
  }

  function cancelEdit() {
    setDisplayName(pet.displayName);
    setDescription(pet.description);
    setSlug(pet.slug);
    setEditing(false);
    setError(null);
  }

  return (
    <article
      className={`grid gap-4 rounded-2xl border bg-white/76 p-4 backdrop-blur md:grid-cols-[160px_1fr_auto] md:items-start ${
        isUntitled
          ? "border-amber-300 bg-amber-50/60"
          : "border-black/10"
      }`}
    >
      <SpritePreview src={pet.spritesheetUrl} />

      <div className="space-y-2">
        {editing ? (
          <div className="space-y-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Pet display name"
              maxLength={60}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-base font-semibold text-stone-950 outline-none focus:border-black/40"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug (url-safe)"
              maxLength={40}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 font-mono text-xs text-stone-700 outline-none focus:border-black/40"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              maxLength={280}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-stone-700 outline-none focus:border-black/40"
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="text-lg font-semibold text-stone-950">
                {displayName}
                {isUntitled ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 align-middle font-mono text-[10px] tracking-[0.15em] text-amber-900 uppercase">
                    Needs name
                  </span>
                ) : null}
              </h3>
              <span className="font-mono text-[10px] tracking-[0.18em] text-stone-400 uppercase">
                /{slug}
              </span>
              <StatusBadge status={status} />
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit pet"
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-stone-600 uppercase transition hover:border-black/30 hover:text-black"
              >
                <Pencil className="size-3" />
                Edit
              </button>
            </div>
            <p className="line-clamp-2 text-sm text-stone-600">{description}</p>
          </>
        )}
        <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase">
          {pet.ownerEmail ? (
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" />
              {pet.ownerEmail}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(pet.createdAt).toLocaleString()}
          </span>
          <span>{stateCount} states</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <a
            href={pet.zipUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-stone-700 underline underline-offset-4 hover:text-black"
          >
            <ExternalLink className="size-3" />
            zip
          </a>
          <a
            href={pet.spritesheetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-stone-700 underline underline-offset-4 hover:text-black"
          >
            <ExternalLink className="size-3" />
            sprite
          </a>
          <a
            href={pet.petJsonUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-stone-700 underline underline-offset-4 hover:text-black"
          >
            <ExternalLink className="size-3" />
            pet.json
          </a>
        </div>
        {error ? (
          <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-900">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-stretch">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-black px-4 text-xs font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 text-xs font-medium text-stone-700 transition hover:border-black/30 disabled:opacity-60"
            >
              <X className="size-3.5" />
              Cancel
            </button>
          </>
        ) : status === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => void decide("approve")}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Approve
            </button>
            <button
              type="button"
              onClick={() => void decide("reject")}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 text-xs font-medium text-stone-700 transition hover:border-rose-400 hover:text-rose-700 disabled:opacity-60"
            >
              <X className="size-3.5" />
              Reject
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: SubmittedPet["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] text-amber-900 uppercase">
        <Clock className="size-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] text-emerald-900 uppercase">
        <Check className="size-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-mono text-[10px] tracking-[0.15em] text-rose-900 uppercase">
      <Slash className="size-3" />
      Rejected
    </span>
  );
}

function SpritePreview({ src }: { src: string }) {
  const [index, setIndex] = useState(0);
  const animation = petStates[index];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % petStates.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="w-fit rounded-2xl border border-black/10 bg-[#f7f8ff] p-3">
      <div
        className="pet-sprite-frame"
        role="img"
        aria-label="pet animation"
        style={{ "--pet-scale": 0.42 } as React.CSSProperties}
      >
        <div
          className="pet-sprite"
          style={
            {
              "--sprite-url": `url(${src})`,
              "--sprite-row": animation.row,
              "--sprite-frames": animation.frames,
              "--sprite-duration": `${animation.durationMs}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}
