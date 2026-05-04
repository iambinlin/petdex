"use client";

import { Archive, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Status = "pending" | "addressed" | "archived";

export function AdminFeedbackActions({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "address" | "archive" | "reopen">(
    null,
  );

  async function run(action: "address" | "archive" | "reopen") {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
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
      setBusy(null);
    }
  }

  const disabled = pending || busy !== null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {status !== "addressed" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("address")}
          aria-label="Mark as addressed"
          title="Mark as addressed"
          className="inline-flex size-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
        >
          {busy === "address" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
        </button>
      ) : null}

      {status !== "archived" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("archive")}
          aria-label="Archive"
          title="Archive"
          className="inline-flex size-8 items-center justify-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/30 hover:text-stone-900 disabled:opacity-60 dark:border-white/10 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-white/30 dark:hover:text-stone-100"
        >
          {busy === "archive" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Archive className="size-3.5" />
          )}
        </button>
      ) : null}

      {status !== "pending" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("reopen")}
          aria-label="Re-open into pending"
          title="Re-open into pending"
          className="inline-flex size-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/40"
        >
          {busy === "reopen" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
        </button>
      ) : null}
    </div>
  );
}
