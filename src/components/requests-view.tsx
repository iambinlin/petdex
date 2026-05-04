"use client";

import { useEffect, useState } from "react";

import { track } from "@vercel/analytics";
import { ArrowUp, Check, Sparkles } from "lucide-react";

type Request = {
  id: string;
  query: string;
  upvoteCount: number;
  status: string;
  fulfilledPetSlug: string | null;
  createdAt: string | Date;
  voted?: boolean;
};

export function RequestsView({ initial }: { initial: Request[] }) {
  const [requests, setRequests] = useState<Request[]>(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Re-fetch on mount with credentials so the user's own votes light up.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/pet-requests");
        if (!res.ok) return;
        const data = (await res.json()) as { requests: Request[] };
        setRequests(data.requests);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function upvote(req: Request) {
    if (pending.has(req.id) || req.voted) return;
    track("pet_request_upvote_clicked", { id: req.id });
    setPending((s) => new Set(s).add(req.id));
    setError(null);
    try {
      const res = await fetch("/api/pet-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: req.query }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          track("pet_request_upvote_blocked", { reason: "unauthorized" });
          setError("Sign in to upvote.");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        track("pet_request_upvote_failed", { status: res.status });
        setError(data.message ?? data.error ?? `Vote failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { upvoteCount: number };
      track("pet_request_upvote_succeeded", { id: req.id, count: data.upvoteCount });
      setRequests((rs) =>
        rs.map((r) =>
          r.id === req.id
            ? { ...r, voted: true, upvoteCount: data.upvoteCount }
            : r,
        ),
      );
    } catch {
      track("pet_request_upvote_failed", { reason: "network" });
      setError("Network error");
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(req.id);
        return next;
      });
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 bg-white/70 p-10 text-center">
        <p className="text-sm text-stone-600">
          No requests yet. The first time someone searches the gallery for a
          pet that doesn't exist, it'll land here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {requests.map((r) => {
          const fulfilled = r.status === "fulfilled" && r.fulfilledPetSlug;
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 px-4 py-3 backdrop-blur transition hover:border-black/20"
            >
              <button
                type="button"
                onClick={() => upvote(r)}
                disabled={pending.has(r.id) || r.voted || fulfilled !== false}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2.5 py-1.5 transition ${
                  r.voted
                    ? "border-[#5266ea] bg-[#5266ea] text-white"
                    : "border-black/10 bg-white text-stone-700 hover:border-[#5266ea]/40 hover:bg-[#eef1ff]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                aria-label={`Upvote "${r.query}"`}
              >
                {r.voted ? (
                  <Check className="size-3.5" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
                <span className="font-mono text-[11px] font-semibold leading-none">
                  {r.upvoteCount}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-900">{r.query}</p>
                <p className="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">
                  {fulfilled ? (
                    <span className="text-emerald-700">
                      Fulfilled · /pets/{r.fulfilledPetSlug}
                    </span>
                  ) : (
                    <>
                      <Sparkles className="-mt-0.5 mr-1 inline-block size-2.5 text-[#5266ea]" />
                      open · {new Date(r.createdAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
