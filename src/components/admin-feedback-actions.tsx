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
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60"
          title="Mark as addressed"
        >
          {busy === "address" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Addressed
        </button>
      ) : null}

      {status !== "archived" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("archive")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-xs font-medium text-stone-700 transition hover:border-black/30 disabled:opacity-60"
          title="Archive"
        >
          {busy === "archive" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Archive className="size-3.5" />
          )}
          Archive
        </button>
      ) : null}

      {status !== "pending" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run("reopen")}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60"
          title="Re-open into pending"
        >
          {busy === "reopen" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Re-open
        </button>
      ) : null}
    </div>
  );
}
