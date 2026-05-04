"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type PetKeyboardNavProps = {
  /** Where ArrowLeft should send the visitor. Null disables that key. */
  prevSlug: string | null;
  /** Where ArrowRight should send the visitor. Null disables that key. */
  nextSlug: string | null;
  /** Where Space should send the visitor (random pet). Null disables. */
  shuffleHref: string | null;
};

// Keyboard shortcuts for the Pokedex-style detail page.
// ArrowLeft  -> previous dex slug
// ArrowRight -> next dex slug
// Space      -> shuffle to a random approved pet
//
// Ignores keystrokes when the user is typing in an input/textarea or has
// a contentEditable focused — we don't want to hijack form fields.
export function PetKeyboardNav({
  prevSlug,
  nextSlug,
  shuffleHref,
}: PetKeyboardNavProps) {
  const router = useRouter();

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!target) return false;
      const el = target as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;

      if (event.key === "ArrowLeft" && prevSlug) {
        event.preventDefault();
        router.push(`/pets/${prevSlug}`);
        return;
      }
      if (event.key === "ArrowRight" && nextSlug) {
        event.preventDefault();
        router.push(`/pets/${nextSlug}`);
        return;
      }
      if (event.key === " " && shuffleHref) {
        event.preventDefault();
        router.push(shuffleHref);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, prevSlug, nextSlug, shuffleHref]);

  return null;
}
