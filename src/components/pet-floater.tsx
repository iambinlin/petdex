"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PetStateId } from "@/lib/pet-states";

import { PetSprite } from "@/components/pet-sprite";

type PetFloaterProps = {
  src: string;
  petName: string;
};

// State priorities for the floater's autonomous behaviour. We keep the
// list small and bias toward "alive but calm" (idle 4x, waiting, waving)
// so the pet doesn't twitch every two seconds.
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

// How long each idle-cycle state lingers (ms). Slight randomness so it
// doesn't feel mechanical.
const IDLE_TICK_MIN_MS = 1700;
const IDLE_TICK_MAX_MS = 3000;

// Click reaction lasts ~900ms then bounces back to idle cycle.
const REACTION_MS = 1100;

// Drag end: keep "running" state for a small window so the pet feels
// like it's catching its breath after being moved.
const RUN_TAIL_MS = 600;

// Edges of the banner the pet should clamp to in pixels. Leaves a safe
// margin so the sprite never disappears off-screen even on small
// viewports.
const SAFE_MARGIN_PX = 12;

// Interactive draggable pet that floats over the banner. Reacts to:
//   - hover/idle cycling (autonomous)
//   - click → quick "waving" or "jumping" burst
//   - drag → "running-left" / "running-right" depending on motion
//
// All state is local; the floater is "client-side ambient". It does not
// touch the URL or write anywhere.
export function PetFloater({ src, petName }: PetFloaterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Position: starts at right ~64px, bottom ~24px relative to the
  // parent (the banner). Updated as the user drags.
  const [pos, setPos] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const [state, setState] = useState<PetStateId>("idle");
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    lastX: number;
  } | null>(null);

  // Idle-cycle ticker — only runs when the pet is NOT being dragged
  // and is NOT in the middle of a click-reaction.
  useEffect(() => {
    if (dragging) return;
    let cancelled = false;
    let i = 0;

    function tick() {
      if (cancelled) return;
      i = (i + 1) % IDLE_CYCLE.length;
      setState(IDLE_CYCLE[i]);
      const wait =
        IDLE_TICK_MIN_MS +
        Math.random() * (IDLE_TICK_MAX_MS - IDLE_TICK_MIN_MS);
      window.setTimeout(tick, wait);
    }

    const id = window.setTimeout(tick, IDLE_TICK_MIN_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [dragging]);

  // Click reaction — alternates between waving and jumping for variety.
  const triggerReaction = useCallback(() => {
    setState((prev) => (prev === "waving" ? "jumping" : "waving"));
    window.setTimeout(() => setState("idle"), REACTION_MS);
  }, []);

  // Anchor the pet to its initial position once we know the parent's
  // bounding box. Parent is the .petdex-cloud banner; floater pins to
  // the right side, vertically near the middle.
  useEffect(() => {
    if (pos.x !== null || pos.y !== null) return;
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    setPos({
      x: rect.width - 180,
      y: Math.max(rect.height * 0.45, 80),
    });
  }, [pos.x, pos.y]);

  // Drag start. Captures pointer so the move events keep firing even
  // if the cursor leaves the floater's hit area.
  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const button = buttonRef.current;
    if (!button) return;
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    button.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: buttonRect.left - parentRect.left,
      originY: buttonRect.top - parentRect.top,
      moved: false,
      lastX: event.clientX,
    };
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      drag.moved = true;
    }

    const button = buttonRef.current;
    if (!button) return;
    const parentRect = parent.getBoundingClientRect();
    const w = button.offsetWidth;
    const h = button.offsetHeight;

    const nextX = Math.min(
      Math.max(drag.originX + dx, SAFE_MARGIN_PX),
      parentRect.width - w - SAFE_MARGIN_PX,
    );
    const nextY = Math.min(
      Math.max(drag.originY + dy, SAFE_MARGIN_PX),
      parentRect.height - h - SAFE_MARGIN_PX,
    );

    setPos({ x: nextX, y: nextY });

    // Direction-aware run state: positive dx -> running-right.
    const horizontal = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    if (horizontal > 1) setState("running-right");
    else if (horizontal < -1) setState("running-left");
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    const button = buttonRef.current;
    if (button?.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }

    if (!drag) return;

    if (!drag.moved) {
      // Treat as a click — short reaction burst.
      triggerReaction();
      return;
    }

    // Cool-down: keep running state for a beat, then settle.
    window.setTimeout(() => setState("idle"), RUN_TAIL_MS);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
    onPointerUp(event);
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="false"
      // Inert wrapper — the floater is positioned absolutely *inside*
      // the banner via this div's parent context. Pointer events pass
      // through except for the button itself.
      className="pointer-events-none absolute inset-0"
    >
      {pos.x !== null && pos.y !== null ? (
        <button
          ref={buttonRef}
          type="button"
          aria-label={`${petName} — drag, click, or just watch`}
          title={`${petName} — drag me, click me`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          // Pointer-events:auto so the button itself receives input,
          // even though the wrapper is pointer-events:none.
          className={`pointer-events-auto absolute select-none rounded-3xl p-2 transition ${
            dragging
              ? "cursor-grabbing"
              : "cursor-grab hover:scale-105 active:scale-95"
          }`}
          style={{
            left: pos.x,
            top: pos.y,
            transitionProperty: "transform",
            transitionDuration: dragging ? "0ms" : "180ms",
            touchAction: "none",
          }}
        >
          <PetSprite
            src={src}
            state={state}
            scale={0.55}
            label={`${petName} interactive sprite`}
          />
        </button>
      ) : null}
    </div>
  );
}
