import Link from "next/link";

import { ExternalLink } from "lucide-react";

import type { PetCredit } from "@/lib/types";
import { isAllowedAvatarUrl, isSafeExternalUrl } from "@/lib/url-allowlist";

type SubmittedByProps = {
  credit: PetCredit;
  // When the pet has a known Petdex creator, link the body to their
  // internal profile and keep the original credit URL as a small icon
  // for attribution.
  handle?: string | null;
};

export function SubmittedBy({ credit, handle }: SubmittedByProps) {
  const showAvatar = credit.imageUrl && isAllowedAvatarUrl(credit.imageUrl);
  const showExternal = credit.url && isSafeExternalUrl(credit.url);

  const innerBody = (
    <>
      {showAvatar ? (
        // biome-ignore lint/performance/noImgElement: external avatar URL
        <img
          src={credit.imageUrl}
          alt=""
          className="size-9 rounded-full ring-1 ring-black/10"
        />
      ) : (
        <div className="grid size-9 place-items-center rounded-full bg-stone-200 font-mono text-xs text-stone-700 ring-1 ring-black/10">
          {credit.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
          Submitted by
        </p>
        <p className="truncate text-sm font-medium text-stone-950">
          {credit.name}
        </p>
      </div>
    </>
  );

  // Internal profile link wins when a handle is known.
  if (handle) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 p-4 backdrop-blur transition hover:border-black/30 hover:bg-white">
        <Link
          href={`/u/${handle}`}
          className="flex flex-1 items-center gap-3 focus:outline-none"
        >
          {innerBody}
        </Link>
        {showExternal ? (
          <a
            href={credit.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="External profile"
            title={credit.url}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-stone-500 transition hover:border-black/30 hover:text-stone-900"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    );
  }

  // Fallback: external-only link, original behavior.
  if (showExternal) {
    return (
      <a
        href={credit.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 p-4 backdrop-blur transition hover:border-black/30 hover:bg-white"
      >
        {innerBody}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 p-4 backdrop-blur">
      {innerBody}
    </div>
  );
}
