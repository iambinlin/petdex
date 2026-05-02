import type { PetCredit } from "@/lib/types";

type SubmittedByProps = {
  credit: PetCredit;
};

export function SubmittedBy({ credit }: SubmittedByProps) {
  const inner = (
    <>
      {credit.imageUrl ? (
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

  if (credit.url) {
    return (
      <a
        href={credit.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 p-4 backdrop-blur transition hover:border-black/30 hover:bg-white"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 p-4 backdrop-blur">
      {inner}
    </div>
  );
}
