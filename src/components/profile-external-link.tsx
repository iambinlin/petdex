"use client";

import { track } from "@vercel/analytics";
import { ExternalLink } from "lucide-react";

export function ProfileExternalLink({
  handle,
  url,
  label,
}: {
  handle: string;
  url: string;
  label: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        track("profile_external_clicked", { handle, host: hostFor(url) });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3 font-mono text-[11px] tracking-[0.06em] text-stone-700 transition hover:border-black/30 hover:bg-white"
    >
      <ExternalLink className="size-3" />
      {label}
    </a>
  );
}

function hostFor(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}
