"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bug,
  Check,
  Heart,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Send,
  X,
} from "lucide-react";

type Kind = "suggestion" | "bug" | "praise" | "other";

const KINDS: { id: Kind; label: string; icon: React.ReactNode }[] = [
  { id: "suggestion", label: "Suggest", icon: <Lightbulb className="size-3.5" /> },
  { id: "bug", label: "Bug", icon: <Bug className="size-3.5" /> },
  { id: "praise", label: "Praise", icon: <Heart className="size-3.5" /> },
  { id: "other", label: "Other", icon: <MessageSquare className="size-3.5" /> },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("suggestion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    | { tag: "idle" }
    | { tag: "submitting" }
    | { tag: "ok" }
    | { tag: "error"; reason: string }
  >({ tag: "idle" });

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close on Escape + click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    // Focus textarea on open.
    window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Auto-close 1.6s after success so the user sees the confirmation tick.
  useEffect(() => {
    if (state.tag !== "ok") return;
    const t = window.setTimeout(() => {
      setOpen(false);
      setMessage("");
      setEmail("");
      setKind("suggestion");
      setState({ tag: "idle" });
    }, 1600);
    return () => window.clearTimeout(t);
  }, [state]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (state.tag === "submitting") return;
      if (message.trim().length < 4) {
        setState({ tag: "error", reason: "Tell us a bit more (4+ chars)." });
        return;
      }
      setState({ tag: "submitting" });
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            message,
            email,
            pageUrl:
              typeof window !== "undefined" ? window.location.href : null,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          setState({
            tag: "error",
            reason:
              data.message ?? data.error ?? `Submit failed (${res.status}).`,
          });
          return;
        }
        setState({ tag: "ok" });
      } catch {
        setState({ tag: "error", reason: "Network error. Try again." });
      }
    },
    [state.tag, message, email, kind],
  );

  return (
    <div ref={popoverRef} className="fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6">
      {open ? (
        <div className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl shadow-blue-950/20">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-[#eef1ff] text-[#5266ea]">
                <MessageCircle className="size-3.5" />
              </span>
              <span className="text-sm font-semibold text-stone-950">
                Send feedback
              </span>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="size-4" />
            </button>
          </div>

          {state.tag === "ok" ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-5" />
              </span>
              <p className="text-base font-medium text-stone-950">
                Thanks. Got it.
              </p>
              <p className="text-xs text-stone-500">
                Every note lands in the queue. We read them all.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => {
                  const active = k.id === kind;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKind(k.id)}
                      aria-pressed={active}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-stone-700 hover:border-black/30"
                      }`}
                    >
                      {k.icon}
                      {k.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (state.tag === "error") setState({ tag: "idle" });
                }}
                placeholder={
                  kind === "bug"
                    ? "What broke? Include steps if you can."
                    : kind === "suggestion"
                      ? "What would make Petdex better?"
                      : kind === "praise"
                        ? "Tell us what you liked."
                        : "What's on your mind?"
                }
                rows={4}
                maxLength={4000}
                className="w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-black/40"
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email (optional, only if you want a reply)"
                className="h-10 w-full rounded-full border border-black/10 bg-white px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-black/40"
              />

              {state.tag === "error" ? (
                <p className="text-xs text-rose-700">{state.reason}</p>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] tracking-tight text-stone-400">
                  {message.length}/4000
                </p>
                <button
                  type="submit"
                  disabled={state.tag === "submitting" || message.length < 4}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black px-4 text-xs font-medium text-white transition hover:bg-black/85 disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  {state.tag === "submitting" ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-lg shadow-blue-950/10 transition hover:border-black/30 hover:text-black hover:shadow-xl"
        >
          <MessageCircle className="size-4 text-[#5266ea]" />
          <span>Feedback</span>
        </button>
      )}
    </div>
  );
}
