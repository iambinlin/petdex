"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PetStateId } from "@/lib/pet-states";

import { PetSprite } from "@/components/pet-sprite";

type PetFloaterProps = {
  src: string;
  petName: string;
};

const IDLE_CYCLE: PetStateId[] = [
  "idle",
  "idle",
  "idle",
  "idle",
  "waiting",
  "waving",
  "jumping",
  "review",
  "idle",
];

const IDLE_TICK_MIN_MS = 1700;
const IDLE_TICK_MAX_MS = 3000;
const REACTION_MS = 1100;
const RUN_TAIL_MS = 600;
const SAFE_MARGIN_PX = 12;
const DRAG_THRESHOLD_PX = 4;
const SPRITE_SIZE_PX = 110;

const HINT_DURATION_MS = 3500;
const HINT_STORAGE_KEY = "petdex_floater_hint_seen_v1";

// Interactive draggable pet that floats over the banner.
//
// Implementation: the visual sits in a React portal mounted on
// document.body so it isn't constrained by the banner's z-index or
// pointer-events stacking. We render an empty 0x0 anchor span where
// <PetFloater /> is placed in the tree; the portal reads that anchor's
// bounding box (and that of its parent banner) on every frame to know
// the visual bounds the pet should clamp to.
//
// Why portal: the banner has a max-w-6xl content wrapper that's a
// sibling/child stacking context for its descendants. Without a portal
// the pet either gets clipped by overflow:hidden or has its pointer
// events blocked by the content above it. The portal sidesteps both.
export function PetFloater({ src, petName }: PetFloaterProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [bounds, setBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<PetStateId>("idle");
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Mount flag for the portal — createPortal needs a DOM target which
  // doesn't exist during SSR.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show the hint glow on first visit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(HINT_STORAGE_KEY);
    if (seen === "1") return;
    setShowHint(true);
    const fade = window.setTimeout(() => setShowHint(false), HINT_DURATION_MS);
    return () => window.clearTimeout(fade);
  }, []);

  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_STORAGE_KEY, "1");
    }
  }

  // Measure the banner's bounding box. We track the anchor's *parent*
  // (the banner's max-w-6xl content div) because that's what the
  // designer wants the pet to live within. Re-measure on resize and
  // scroll so the pet stays aligned to the banner as the page shifts.
  useEffect(() => {
    if (!mounted) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const banner = anchor.closest(".petdex-cloud") as HTMLElement | null;
    if (!banner) return;

    function measure() {
      // Re-query each tick: the banner exists, but its rect changes on
      // resize / scroll.
      if (!banner) return;
      const rect = banner.getBoundingClientRect();
      setBounds({
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    // ResizeObserver covers cases where the banner's content reflows
    // without a window resize (e.g. fonts loading later).
    const obs = new ResizeObserver(measure);
    obs.observe(banner);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      obs.disconnect();
    };
  }, [mounted]);

  // Initial position: roughly half-way across the banner, centered
  // vertically. Recomputed only the first time bounds become known.
  useEffect(() => {
    if (pos !== null) return;
    if (!bounds) return;
    const initialX = Math.min(
      Math.max(bounds.width * 0.55, SAFE_MARGIN_PX),
      bounds.width - SPRITE_SIZE_PX - SAFE_MARGIN_PX,
    );
    const initialY = Math.min(
      Math.max(bounds.height * 0.4, SAFE_MARGIN_PX),
      bounds.height - SPRITE_SIZE_PX - SAFE_MARGIN_PX,
    );
    setPos({ x: initialX, y: initialY });
  }, [bounds, pos]);

  // Idle-cycle ticker — paused while dragging.
  useEffect(() => {
    if (dragging) return;
    let cancelled = false;
    let i = 0;
    let timeoutId: number | null = null;

    function tick() {
      if (cancelled) return;
      i = (i + 1) % IDLE_CYCLE.length;
      setState(IDLE_CYCLE[i]);
      const wait =
        IDLE_TICK_MIN_MS +
        Math.random() * (IDLE_TICK_MAX_MS - IDLE_TICK_MIN_MS);
      timeoutId = window.setTimeout(tick, wait);
    }

    timeoutId = window.setTimeout(tick, IDLE_TICK_MIN_MS);
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [dragging]);

  const triggerReaction = useCallback(() => {
    setState((prev) => (prev === "waving" ? "jumping" : "waving"));
    window.setTimeout(() => setState("idle"), REACTION_MS);
  }, []);

  // Drag handler. Window-level listeners + each drag re-arms cleanly.
  // Coordinates are stored in banner-relative space (x, y inside the
  // banner) so re-renders / page scrolls don't shift the visual.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startBounds = bounds;
      const startPos = pos;
      if (!startBounds || !startPos) return;

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const originX = startPos.x;
      const originY = startPos.y;

      let moved = false;
      let lastX = startClientX;

      setDragging(true);
      dismissHint();

      function handleMove(ev: PointerEvent) {
        if (ev.pointerId !== event.pointerId) return;
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
          moved = true;
        }
        if (!startBounds) return;
        const w = SPRITE_SIZE_PX;
        const h = SPRITE_SIZE_PX;
        const nextX = Math.min(
          Math.max(originX + dx, SAFE_MARGIN_PX),
          startBounds.width - w - SAFE_MARGIN_PX,
        );
        const nextY = Math.min(
          Math.max(originY + dy, SAFE_MARGIN_PX),
          startBounds.height - h - SAFE_MARGIN_PX,
        );
        setPos({ x: nextX, y: nextY });

        const horizontal = ev.clientX - lastX;
        lastX = ev.clientX;
        if (horizontal > 1) setState("running-right");
        else if (horizontal < -1) setState("running-left");
      }

      function handleUp(ev: PointerEvent) {
        if (ev.pointerId !== event.pointerId) return;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        setDragging(false);
        if (!moved) {
          triggerReaction();
          return;
        }
        window.setTimeout(() => setState("idle"), RUN_TAIL_MS);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [bounds, pos, triggerReaction],
  );

  // The anchor span is what gets rendered in the React tree where
  // <PetFloater /> is placed. It's invisible (size 0) and only exists
  // so we can find the closest .petdex-cloud ancestor and observe its
  // size.
  const anchor = (
    <span
      ref={anchorRef}
      aria-hidden="true"
      className="pointer-events-none absolute size-0"
    />
  );

  // The actual visible pet, portaled onto document.body. Position uses
  // page coordinates (bounds.left/top + pet's banner-relative x/y).
  const portalled = (() => {
    if (!mounted || !bounds || !pos) return null;
    return createPortal(
      <button
        type="button"
        aria-label={`${petName} — drag, click, or just watch`}
        title={`${petName} — drag me, click me`}
        onPointerDown={onPointerDown}
        className={`absolute z-30 select-none rounded-3xl p-2 transition-transform ${
          dragging
            ? "cursor-grabbing"
            : "cursor-grab hover:scale-105 active:scale-95"
        }`}
        style={{
          left: bounds.left + pos.x,
          top: bounds.top + pos.y,
          transitionDuration: dragging ? "0ms" : "180ms",
          touchAction: "none",
        }}
      >
        {showHint ? (
          <>
            <span
              aria-hidden="true"
              className="pet-floater-hint-ring pointer-events-none absolute inset-0 rounded-3xl"
            />
            <span
              aria-hidden="true"
              className="pet-floater-hint-ring pet-floater-hint-ring--late pointer-events-none absolute inset-0 rounded-3xl"
            />
          </>
        ) : null}
        <PetSprite
          src={src}
          state={state}
          scale={0.55}
          label={`${petName} interactive sprite`}
        />
      </button>,
      document.body,
    );
  })();

  return (
    <>
      {anchor}
      {portalled}
    </>
  );
}
