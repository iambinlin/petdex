"use client";

import { useEffect, useState } from "react";

import { track } from "@vercel/analytics";
import { ArrowUp, Check, Plus, Sparkles } from "lucide-react";

type Request = {
  id: string;
  query: string;
  upvoteCount: number;
  status: string;
  fulfilledPetSlug: string | null;
  createdAt: string | Date;
  voted?: boolean;
};

const MIN_LEN = 4;
const MAX_LEN = 200;

export function RequestsView({ initial }: { initial: Request[] }) {
  const [requests, setRequests] = useState<Request[]>(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<
    | { mode: "created" | "upvoted"; query: string; count: number }
    | null
  >(null);

  // Re-fetch on mount with credentials so the user's own votes light up.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pet-requests");
        if (!res.ok) return;
        const data = (await res.json()) as { requests: Request[] };
        if (cancelled) return;
        setRequests(data.requests);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = draft.trim();
    if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) {
      setFormError(`Tell us a bit more (${MIN_LEN}-${MAX_LEN} chars).`);
      return;
    }
    track("pet_request_clicked", { from: "requests_form" });
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/pet-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          track("pet_request_blocked", { reason: "unauthorized" });
          setFormError("Sign in to request a pet.");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        track("pet_request_failed", { status: res.status });
        setFormError(
          data.message ?? data.error ?? `Submit failed (${res.status})`,
        );
        return;
      }
      const data = (await res.json()) as {
        mode: "created" | "upvoted";
        upvoteCount: number;
        id: string;
      };
      track("pet_request_succeeded", {
        mode: data.mode,
        upvotes: data.upvoteCount,
      });
      setLastResult({
        mode: data.mode,
        query: trimmed,
        count: data.upvoteCount,
      });
      setDraft("");
      // Refresh the list so the new / upvoted item lands at the top.
      try {
        const r2 = await fetch("/api/pet-requests");
        if (r2.ok) {
          const d2 = (await r2.json()) as { requests: Request[] };
          setRequests(d2.requests);
        }
      } catch {
        /* ignore — we still showed feedback */
      }
    } catch {
      track("pet_request_failed", { reason: "network" });
      setFormError("Network error, try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
      track("pet_request_upvote_succeeded", {
        id: req.id,
        count: data.upvoteCount,
      });
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

  return (
    <div className="space-y-6">
      {/* Always-visible request form. Same surface treatment as the
          gallery control bar so they read as part of the same product. */}
      <form
        onSubmit={submitForm}
        className="space-y-3 rounded-3xl border border-black/[0.06] bg-white px-4 py-4 shadow-[0_8px_24px_-12px_rgba(56,71,245,0.18)]"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#5266ea] text-white">
            <Sparkles className="size-3.5" />
          </span>
          <p className="text-sm font-semibold text-stone-950">
            Request a pet
          </p>
        </div>
        <p className="text-xs text-stone-500">
          Describe the pet you'd like to see — character, theme, vibe. If
          someone else already asked for the same thing, your submission
          turns into an upvote on theirs.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <label className="relative block w-full flex-1">
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (formError) setFormError(null);
                if (lastResult) setLastResult(null);
              }}
              placeholder="e.g. a Studio Ghibli chinchilla, a sleepy axolotl coder, Spider-Pig"
              maxLength={MAX_LEN}
              className="h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#5266ea]/60 focus:ring-2 focus:ring-[#5266ea]/15"
            />
            <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 font-mono text-[10px] text-stone-300">
              {draft.length}/{MAX_LEN}
            </span>
          </label>
          <button
            type="submit"
            disabled={submitting || draft.trim().length < MIN_LEN}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#5266ea] px-5 text-sm font-medium text-white transition hover:bg-[#3847f5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            {submitting ? "Sending…" : "Request"}
          </button>
        </div>
        {formError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {formError}
          </p>
        ) : null}
        {lastResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
            <Check className="-mt-0.5 mr-1 inline-block size-3.5" />
            {lastResult.mode === "created"
              ? `Requested "${lastResult.query}". Others can upvote it now.`
              : `Upvoted existing request for "${lastResult.query}" — now at ${lastResult.count} votes.`}
          </p>
        ) : null}
      </form>

      {/* List of existing requests */}
      {requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 text-center">
          <p className="text-sm font-medium text-stone-950">
            No requests yet — be the first.
          </p>
          <p className="mt-1.5 text-xs text-stone-500">
            Or search{" "}
            <a
              href="/#gallery"
              className="text-[#5266ea] underline-offset-4 hover:underline"
            >
              the gallery
            </a>{" "}
            and request a pet directly from the no-results screen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {error}
            </p>
          ) : null}
          <p className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase">
            {requests.length} open request{requests.length === 1 ? "" : "s"}
          </p>
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
                    disabled={
                      pending.has(r.id) || r.voted || fulfilled !== false
                    }
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
      )}
    </div>
  );
}
