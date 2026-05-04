"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { track } from "@vercel/analytics";
import {
  ArrowUp,
  Check,
  ExternalLink,
  Flame,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

type ClerkInfo = {
  handle: string;
  displayName: string | null;
  username: string | null;
  imageUrl: string | null;
};

type FulfilledPet = {
  slug: string;
  displayName: string;
  spritesheetUrl: string;
};

export type RequestRow = {
  id: string;
  query: string;
  upvoteCount: number;
  status: string;
  fulfilledPetSlug: string | null;
  createdAt: string | Date;
  voted?: boolean;
  requester: ClerkInfo | null;
  voters: ClerkInfo[];
  fulfilledPet: FulfilledPet | null;
};

const MIN_LEN = 4;
const MAX_LEN = 200;

type Sort = "top" | "new" | "fulfilled";

export function RequestsView({ initial }: { initial: RequestRow[] }) {
  const [requests, setRequests] = useState<RequestRow[]>(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("top");
  const [search, setSearch] = useState("");

  // Form state
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<
    | { mode: "created" | "upvoted"; query: string; count: number }
    | null
  >(null);

  // Re-fetch with credentials so the user's own votes light up.
  // We always pull status=all so all three sort tabs work without
  // another roundtrip when the user toggles them.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pet-requests?status=all&limit=80");
        if (!res.ok) return;
        const data = (await res.json()) as { requests: RequestRow[] };
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

  const counts = useMemo(() => {
    return {
      open: requests.filter((r) => r.status === "open").length,
      fulfilled: requests.filter((r) => r.status === "fulfilled").length,
      total: requests.length,
    };
  }, [requests]);

  const visible = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    let list = requests;
    if (sort === "fulfilled") {
      list = list.filter((r) => r.status === "fulfilled");
    } else if (sort === "new") {
      list = list
        .filter((r) => r.status === "open")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    } else {
      // top
      list = list.filter((r) => r.status === "open");
    }
    if (trimmed) {
      list = list.filter((r) => r.query.toLowerCase().includes(trimmed));
    }
    return list;
  }, [requests, sort, search]);

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
      try {
        const r2 = await fetch("/api/pet-requests?status=all&limit=80");
        if (r2.ok) {
          const d2 = (await r2.json()) as { requests: RequestRow[] };
          setRequests(d2.requests);
        }
      } catch {
        /* ignore */
      }
    } catch {
      track("pet_request_failed", { reason: "network" });
      setFormError("Network error, try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function upvote(req: RequestRow) {
    if (pending.has(req.id) || req.voted || req.status === "fulfilled") return;
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
          setError("Sign in to upvote.");
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setError(data.message ?? data.error ?? `Vote failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { upvoteCount: number };
      setRequests((rs) =>
        rs.map((r) =>
          r.id === req.id
            ? { ...r, voted: true, upvoteCount: data.upvoteCount }
            : r,
        ),
      );
    } catch {
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
      {/* Always-visible request form */}
      <form
        onSubmit={submitForm}
        className="space-y-3 rounded-3xl border border-black/[0.06] bg-white px-4 py-4 shadow-[0_8px_24px_-12px_rgba(56,71,245,0.18)] dark:border-white/[0.06] dark:bg-stone-900"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-[#5266ea] text-white">
            <Sparkles className="size-3.5" />
          </span>
          <p className="text-sm font-semibold text-stone-950 dark:text-stone-100">Request a pet</p>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Describe the pet you'd like to see — character, theme, vibe. If
          someone else already asked for the same thing, your submission turns
          into an upvote on theirs.
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
              className="h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#5266ea]/60 focus:ring-2 focus:ring-[#5266ea]/15 dark:border-white/10 dark:bg-stone-900 dark:text-stone-100"
            />
            <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 font-mono text-[10px] text-stone-300 dark:text-stone-600">
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
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
            {formError}
          </p>
        ) : null}
        {lastResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="-mt-0.5 mr-1 inline-block size-3.5" />
            {lastResult.mode === "created"
              ? `Requested "${lastResult.query}". Others can upvote it now.`
              : `Upvoted existing request for "${lastResult.query}" — now at ${lastResult.count} votes.`}
          </p>
        ) : null}
      </form>

      {/* Sort tabs + search */}
      {requests.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <SortTab
            active={sort === "top"}
            onClick={() => setSort("top")}
            icon={<Flame className="size-3.5" />}
            label="Top voted"
            count={counts.open}
          />
          <SortTab
            active={sort === "new"}
            onClick={() => setSort("new")}
            icon={<Sparkles className="size-3.5" />}
            label="Newest"
            count={counts.open}
          />
          <SortTab
            active={sort === "fulfilled"}
            onClick={() => setSort("fulfilled")}
            icon={<Check className="size-3.5" />}
            label="Fulfilled"
            count={counts.fulfilled}
          />
          <label className="relative ml-auto block w-48">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-3.5 text-stone-400 dark:text-stone-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="h-9 w-full rounded-full border border-black/10 bg-white pr-3 pl-8 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#5266ea]/60 dark:border-white/10 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
        </div>
      ) : null}

      {/* List */}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 text-center text-sm text-stone-600 dark:border-white/15 dark:bg-stone-900/70 dark:text-stone-400">
          {search
            ? `No requests match "${search}".`
            : "Nothing in this view yet."}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              upvote={() => void upvote(r)}
              busy={pending.has(r.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SortTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
        active
          ? "border-black bg-black text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950"
          : "border-black/10 bg-white text-stone-700 hover:border-black/30 dark:border-white/10 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-white/30"
            }`}
    >
      {icon}
      {label}
      <span
        className={`font-mono text-[10px] ${
          active ? "text-white/70" : "text-stone-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function RequestCard({
  request,
  upvote,
  busy,
}: {
  request: RequestRow;
  upvote: () => void;
  busy: boolean;
}) {
  const fulfilled = request.status === "fulfilled";
  const top3 = request.voters.slice(0, 3);
  const moreVoters = Math.max(0, request.upvoteCount - top3.length);

  return (
    <li
      className={`group rounded-2xl border bg-white px-4 py-3.5 backdrop-blur transition ${
        fulfilled
          ? "border-emerald-200 hover:border-emerald-300"
          : "border-black/10 hover:border-[#5266ea]/40 hover:shadow-[0_18px_45px_-26px_rgba(82,102,234,0.4)]"
      } dark:bg-stone-900`}
    >
      <div className="flex items-start gap-3">
        {/* Vote button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            upvote();
          }}
          disabled={busy || request.voted || fulfilled}
          aria-label={`Upvote "${request.query}"`}
          className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition ${
            request.voted
              ? "border-[#5266ea] bg-[#5266ea] text-white"
              : "border-black/10 bg-white text-stone-700 hover:border-[#5266ea]/40 hover:bg-[#eef1ff]"
          } disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-900 dark:text-stone-300`}
        >
          {request.voted ? (
            <Check className="size-4" />
          ) : (
            <ArrowUp className="size-4" />
          )}
          <span className="font-mono text-sm font-semibold leading-none">
            {request.upvoteCount}
          </span>
        </button>

        {/* Body */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm leading-6 font-medium text-stone-900 dark:text-stone-100">
              {request.query}
            </p>
            {fulfilled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-emerald-900 uppercase ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="size-3" />
                Fulfilled
              </span>
            ) : null}
            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase dark:text-stone-500">
              {new Date(request.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {/* Requester */}
            {request.requester ? (
              <Link
                href={`/u/${request.requester.handle}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2 py-0.5 text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                {request.requester.imageUrl ? (
                  // biome-ignore lint/performance/noImgElement: Clerk avatar
                  <img
                    src={request.requester.imageUrl}
                    alt=""
                    className="size-4 rounded-full ring-1 ring-black/10"
                  />
                ) : (
                  <span className="grid size-4 place-items-center rounded-full bg-stone-200 font-mono text-[8px] font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-300">
                    {(request.requester.displayName ??
                      request.requester.handle)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <span>
                  {request.requester.displayName ??
                    `@${request.requester.handle}`}
                </span>
              </Link>
            ) : null}

            {/* Voter avatar stack */}
            {top3.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
                <span className="flex -space-x-1.5">
                  {top3.map((v) =>
                    v.imageUrl ? (
                      // biome-ignore lint/performance/noImgElement: Clerk avatar
                      <img
                        key={v.handle}
                        src={v.imageUrl}
                        alt=""
                        title={v.displayName ?? `@${v.handle}`}
                        className="size-5 rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <span
                        key={v.handle}
                        title={v.displayName ?? `@${v.handle}`}
                        className="grid size-5 place-items-center rounded-full bg-stone-200 font-mono text-[8px] font-semibold text-stone-700 ring-2 ring-white dark:bg-stone-700 dark:text-stone-300"
                      >
                        {(v.displayName ?? v.handle).slice(0, 1).toUpperCase()}
                      </span>
                    ),
                  )}
                </span>
                {moreVoters > 0 ? (
                  <span className="font-mono text-[10px]">
                    +{moreVoters} more
                  </span>
                ) : null}
              </span>
            ) : null}

            {/* Fulfilled pet CTA */}
            {fulfilled && request.fulfilledPet ? (
              <Link
                href={`/pets/${request.fulfilledPet.slug}`}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
              >
                <Sparkles className="size-3" />
                {request.fulfilledPet.displayName}
                <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3 rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 text-center dark:border-white/15 dark:bg-stone-900/70">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#eef1ff] text-[#5266ea] dark:bg-[#1f2240]">
        <Sparkles className="size-4" />
      </span>
      <p className="text-sm font-medium text-stone-950 dark:text-stone-100">
        No requests yet — be the first.
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
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
  );
}
