"use client";

// Owner-only reorderable pinned-pets grid for /u/<handle>. Wraps the
// existing PetCard layout with native HTML5 drag-and-drop on desktop
// plus left/right arrow controls for touch + keyboard. Saves via
// PATCH /api/profile { featuredPetSlugs: [...] } with optimistic UI.
//
// Why HTML5 DnD vs a library: pinned grids cap at MAX_PINNED_PETS (6)
// so we don't need keyboard sortable accessibility primitives or virtual
// lists. Native DnD ships zero JS, and the keyboard fallback covers
// users who can't drag.

import { useState, useTransition } from "react";

import { ArrowLeft, ArrowRight, Check, GripVertical, X } from "lucide-react";

import type { PetWithMetrics } from "@/lib/pets";
import { MAX_PINNED_PETS } from "@/lib/profiles";

import { PetCard } from "@/components/pet-gallery";
import { ProfilePinButton } from "@/components/profile-pin-button";

type PinnedReorderGridProps = {
  pets: PetWithMetrics[];
  petStateCount: number;
};

export function PinnedReorderGrid({
  pets,
  petStateCount,
}: PinnedReorderGridProps) {
  const [order, setOrder] = useState<PetWithMetrics[]>(pets);
  const [editing, setEditing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const initialSlugs = pets.map((p) => p.slug).join(",");
  const currentSlugs = order.map((p) => p.slug).join(",");
  const dirty = editing && initialSlugs !== currentSlugs;

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const next = prev.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function cancel() {
    setOrder(pets);
    setEditing(false);
    setDragIndex(null);
    setOverIndex(null);
    setError(null);
  }

  function save() {
    setError(null);
    startSave(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featuredPetSlugs: order.map((p) => p.slug),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `save failed (${res.status})`);
        }
        setEditing(false);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // Render the existing single-card layout when there's only one pin —
  // there's nothing to reorder, but owners can still toggle edit mode
  // for consistency with the multi-pet view.
  const oneOnly = order.length <= 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-[0.22em] text-brand uppercase">
          ★ Pinned
        </p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-4 uppercase">
            {order.length} of {MAX_PINNED_PETS}
          </p>
          {!editing ? (
            order.length >= 2 ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-base bg-surface px-3 text-[11px] font-medium text-muted-2 transition hover:border-border-strong hover:text-foreground"
              >
                <GripVertical className="size-3" />
                Reorder
              </button>
            ) : null
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cancel}
                disabled={isSaving}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border-base bg-surface px-3 text-[11px] font-medium text-muted-2 transition hover:border-border-strong disabled:opacity-50"
              >
                <X className="size-3" />
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || isSaving}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-inverse px-3 text-[11px] font-medium text-on-inverse transition hover:bg-inverse-hover disabled:opacity-50"
              >
                <Check className="size-3" />
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {editing ? (
        <p className="text-xs text-muted-3">
          Drag a pet to reorder, or use the arrows. Click Save when you're done.
        </p>
      ) : null}

      <div
        className={
          oneOnly
            ? "relative"
            : "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6"
        }
      >
        {order.map((pet, index) => {
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== index;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: drag wrapper; arrow buttons inside provide keyboard a11y
            <div
              key={pet.slug}
              className={`relative h-full transition ${
                editing ? "cursor-grab active:cursor-grabbing" : ""
              } ${isDragging ? "scale-[0.98] opacity-40" : ""} ${
                isOver
                  ? "rounded-3xl ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : ""
              }`}
              draggable={editing}
              onDragStart={(e) => {
                if (!editing) return;
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
                // Firefox needs setData or the drag event aborts.
                e.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(e) => {
                if (!editing || dragIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overIndex !== index) setOverIndex(index);
              }}
              onDragLeave={() => {
                if (overIndex === index) setOverIndex(null);
              }}
              onDrop={(e) => {
                if (!editing || dragIndex === null) return;
                e.preventDefault();
                move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <PetCard pet={pet} index={index} stateCount={petStateCount} />

              {editing ? (
                <>
                  <div className="absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-surface/95 text-muted-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                    <GripVertical className="size-3.5" />
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${pet.displayName} left`}
                      className="grid size-7 place-items-center rounded-full bg-surface/95 text-muted-2 shadow-sm ring-1 ring-black/5 transition hover:text-foreground disabled:opacity-30 dark:ring-white/10"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, index + 1)}
                      disabled={index === order.length - 1}
                      aria-label={`Move ${pet.displayName} right`}
                      className="grid size-7 place-items-center rounded-full bg-surface/95 text-muted-2 shadow-sm ring-1 ring-black/5 transition hover:text-foreground disabled:opacity-30 dark:ring-white/10"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute top-3 right-14">
                  <ProfilePinButton
                    slug={pet.slug}
                    isPinned
                    pinnedCount={order.length}
                    maxPins={MAX_PINNED_PETS}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
