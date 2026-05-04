import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { desc } from "drizzle-orm";
import {
  ArrowLeft,
  Bug,
  Heart,
  Lightbulb,
  MessageSquare,
} from "lucide-react";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";

export const metadata = {
  title: "Petdex — Admin · Feedback",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KIND_META: Record<
  string,
  { label: string; tone: string; icon: React.ReactNode }
> = {
  suggestion: {
    label: "Suggest",
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
    icon: <Lightbulb className="size-3.5" />,
  },
  bug: {
    label: "Bug",
    tone: "bg-rose-50 text-rose-900 ring-rose-200",
    icon: <Bug className="size-3.5" />,
  },
  praise: {
    label: "Praise",
    tone: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    icon: <Heart className="size-3.5" />,
  },
  other: {
    label: "Other",
    tone: "bg-stone-50 text-stone-900 ring-stone-200",
    icon: <MessageSquare className="size-3.5" />,
  },
};

export default async function AdminFeedbackPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const rows = await db
    .select()
    .from(schema.feedback)
    .orderBy(desc(schema.feedback.createdAt))
    .limit(200);

  const counts = {
    suggestion: rows.filter((r) => r.kind === "suggestion").length,
    bug: rows.filter((r) => r.kind === "bug").length,
    praise: rows.filter((r) => r.kind === "praise").length,
    other: rows.filter((r) => r.kind === "other").length,
  };

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-black backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            Back to review queue
          </Link>
          <span className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase">
            Admin · {rows.length} feedback
          </span>
        </div>

        <header>
          <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
            Inbox
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
            Feedback
          </h1>
          <p className="mt-3 text-sm text-stone-600">
            {counts.suggestion} suggestion · {counts.bug} bug ·{" "}
            {counts.praise} praise · {counts.other} other
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm text-stone-600">
            No feedback yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const meta = KIND_META[r.kind] ?? KIND_META.other;
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase ring-1 ${meta.tone}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    {r.email ? (
                      <a
                        href={`mailto:${r.email}?subject=Re: your Petdex feedback`}
                        className="rounded-full border border-black/10 bg-white px-2 py-0.5 font-mono text-[10px] tracking-tight text-stone-700 transition hover:border-black/30 hover:text-black"
                      >
                        {r.email}
                      </a>
                    ) : null}
                    {r.userId ? (
                      <span className="font-mono text-[10px] tracking-tight text-stone-400">
                        {r.userId.slice(0, 14)}…
                      </span>
                    ) : null}
                    {r.pageUrl ? (
                      <a
                        href={r.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] tracking-tight text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
                      >
                        {new URL(r.pageUrl).pathname}
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-800 whitespace-pre-wrap">
                    {r.message}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
