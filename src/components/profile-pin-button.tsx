"use client";

import { Loader2, Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// One-click pin/unpin for an approved pet on the owner's /u/[handle]
// page. Calls /api/profile with featuredPetSlug.
export function ProfilePinButton({
  slug,
  isPinned,
}: {
  slug: string;
  isPinned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          featuredPetSlug: isPinned ? null : slug,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        alert(`Failed: ${j?.error ?? res.statusText}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={isPinned ? "Unpin from profile" : "Pin to profile"}
      aria-label={isPinned ? "Unpin from profile" : "Pin to profile"}
      style={{ zIndex: 30 }}
      className={`inline-flex size-8 items-center justify-center rounded-full border backdrop-blur transition disabled:opacity-60 ${
        isPinned
          ? "border-[#5266ea]/40 bg-[#5266ea] text-white hover:bg-[#3847f5]"
          : "border-black/10 bg-white/90 text-stone-600 hover:border-black/30 hover:text-black"
      }`}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isPinned ? (
        <PinOff className="size-3.5" />
      ) : (
        <Pin className="size-3.5" />
      )}
    </button>
  );
}
