"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PetStateId } from "@/lib/pet-states";

import { PetSprite } from "@/components/pet-sprite";

type PetFloaterProps = {
  src: string;
  petName: string;
};

// Idle-cycle states the pet rotates through autonomously when nobody
// is interacting with it. Biased toward calm states so the pet doesn't
// twitch every two seconds — repeats of "idle" make it feel alive but
// chill.
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
// Margin from the banner edge so the pet never pokes out into chrome.
const SAFE_MARGIN_PX = 12;
// Treat anything under this much pointer movement as a click, not a drag.
const DRAG_THRESHOLD_PX = 4;

// Approx pet sprite size after scale (~106px wide, ~115px tall).
// Used so the initial anchor is fully inside the banner regardless of
// scroll / responsive width.
const SPRITE_SIZE_PX = 110;

// First-impression "tap me" hint — a brand-tinted glow ring pulses for
// this many ms after the floater mounts, then fades out so it doesn't
// distract once the user understands the affordance. Persists across
// page navigations via localStorage so we don't re-prompt on every
// dex entry.
const HINT_DURATION_MS = 3500;
const HINT_STORAGE_KEY = "petdex_floater_hint_seen_v1";

// Interactive draggable pet that floats over the banner.
// - Idle: cycles through breathing/waving/jumping etc autonomously.
// - Click: quick waving/jumping burst, then settles back to idle.
// - Drag: switches to running-left/running-right based on horizontal
//   velocity; settles back to idle a beat after release.
//
// Implementation notes:
// - Uses *window* pointermove/up listeners attached on pointerdown,
//   not setPointerCapture on the button. setPointerCapture would lose
//   the capture on some browsers when the React tree re-renders during
//   the drag (which it does on every setPos), making the second drag
//   silently fail. Window listeners survive any re-render.
// - dragging state is mirrored into a ref so the listeners can read it
//   without re-attaching on every update.
export function PetFloater({ src, petName }: PetFloaterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Position is null until the parent's bounding box is measured.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<PetStateId>("idle");
  const [dragging, setDragging] = useState(false);
  // Tap-me glow visible on first visit. Auto-fades after HINT_DURATION_MS
  // and persists "seen" in localStorage so it doesn't re-trigger on
  // every dex page load.
  const [showHint, setShowHint] = useState(false);

  // Show the hint once per browser, on the first floater the user sees.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(HINT_STORAGE_KEY);
    if (seen === "1") return;
    setShowHint(true);
    const fade = window.setTimeout(() => setShowHint(false), HINT_DURATION_MS);
    return () => window.clearTimeout(fade);
  }, []);

  // Mark the hint as "seen" the first time the user actually interacts
  // with the floater. Hides the glow immediately too so the visual
  // confirms their action.
  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_STORAGE_KEY, "1");
    }
  }

  // Anchor the pet to its initial position once we know the parent's
  // size. We park it just past the right edge of the banner's text
  // column (~620px) so it doesn't overlap the title on wide screens
  // but stays within view on narrow ones.
  useEffect(() => {
    if (pos !== null) return;
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    // Right-of-center but with a healthy margin so it doesn't kiss the
    // edge of the banner. Vertically: centered on the banner.
    const initialX = Math.max(
      rect.width * 0.62,
      rect.width - SPRITE_SIZE_PX - 60,
    );
    const initialY = Math.max(rect.height * 0.42, 70);
    setPos({
      x: Math.min(initialX, rect.width - SPRITE_SIZE_PX - SAFE_MARGIN_PX),
      y: initialY,
    });
  }, [pos]);

  // Idle-cycle ticker — paused while the pet is being dragged.
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

  // Click reaction — short waving/jumping burst, then snap back to idle.
  const triggerReaction = useCallback(() => {
    setState((prev) => (prev === "waving" ? "jumping" : "waving"));
    window.setTimeout(() => setState("idle"), REACTION_MS);
  }, []);

  // Drag handler. Reads/writes pos via setPos directly, attaches window
  // listeners on pointerdown so subsequent drags always re-arm cleanly.
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const parent = containerRef.current?.parentElement;
      const button = event.currentTarget;
      if (!parent) return;
      const parentEl: HTMLElement = parent;

      const parentRect = parentEl.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = buttonRect.left - parentRect.left;
      const originY = buttonRect.top - parentRect.top;
      const w = button.offsetWidth;
      const h = button.offsetHeight;

      let moved = false;
      let lastX = startX;

      setDragging(true);
      dismissHint();

      function handleMove(ev: PointerEvent) {
        if (ev.pointerId !== event.pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
          moved = true;
        }

        // Re-measure parent bounds each move so window resize during
        // a drag doesn't lock the pet outside the banner.
        const fresh = parentEl.getBoundingClientRect();
        const nextX = Math.min(
          Math.max(originX + dx, SAFE_MARGIN_PX),
          fresh.width - w - SAFE_MARGIN_PX,
        );
        const nextY = Math.min(
          Math.max(originY + dy, SAFE_MARGIN_PX),
          fresh.height - h - SAFE_MARGIN_PX,
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
          // Treat as a click.
          triggerReaction();
          return;
        }
        // Cool-down so the pet keeps running for a moment after release.
        window.setTimeout(() => setState("idle"), RUN_TAIL_MS);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [triggerReaction],
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="false"
      // Inert wrapper — only the button receives pointer input. The
      // wrapper just provides the absolute-positioning context.
      className="pointer-events-none absolute inset-0"
    >
      {pos ? (
        <button
          type="button"
          aria-label={`${petName} — drag, click, or just watch`}
          title={`${petName} — drag me, click me`}
          onPointerDown={onPointerDown}
          className={`pointer-events-auto absolute select-none rounded-3xl p-2 transition-transform ${
            dragging
              ? "cursor-grabbing"
              : "cursor-grab hover:scale-105 active:scale-95"
          }`}
          style={{
            left: pos.x,
            top: pos.y,
            transitionDuration: dragging ? "0ms" : "180ms",
            touchAction: "none",
          }}
        >
          {/* Tap-me hint — pulsing brand glow ring on first visit.
              Sits behind the sprite as a sibling absolute layer so it
              doesn't affect the click target geometry. Fades out by
              animation, then unmounts via showHint=false. */}
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
        </button>
      ) : null}
    </div>
  );
}
