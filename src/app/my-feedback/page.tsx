import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, sql as dsql } from "drizzle-orm";
import { Bug, Heart, Lightbulb, MessageSquare } from "lucide-react";

import { db, schema } from "@/lib/db/client";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My feedback",
  description: "Threads with the Petdex team about feedback you've shared.",
  alternates: { canonical: "/my-feedback" },
  robots: { index: false, follow: false },
};

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

const STATUS_META: Record<string, { label: string; tone: string }> = {
  pending: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
  },
  addressed: {
    label: "Addressed",
    tone: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  },
  archived: {
    label: "Archived",
    tone: "bg-stone-100 text-stone-600 ring-stone-200",
  },
};

export default async function MyFeedbackPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const rows = await db
    .select()
    .from(schema.feedback)
    .where(eq(schema.feedback.userId, userId))
    .orderBy(desc(schema.feedback.createdAt));

  // Pull aggregate per thread: latest reply timestamp + last admin reply.
  const ids = rows.map((r) => r.id);
  type LatestRow = {
    feedbackId: string;
    latestAt: Date | null;
    latestAdminAt: Date | null;
    replyCount: number;
  };
  const latestMap = new Map<string, LatestRow>();
  if (ids.length > 0) {
    const latest = await db
      .select({
        feedbackId: schema.feedbackReplies.feedbackId,
        latestAt: dsql<Date>`MAX(${schema.feedbackReplies.createdAt})`,
        latestAdminAt: dsql<Date | null>`MAX(${schema.feedbackReplies.createdAt}) FILTER (WHERE ${schema.feedbackReplies.authorKind} = 'admin')`,
        replyCount: dsql<number>`COUNT(*)::int`,
      })
      .from(schema.feedbackReplies)
      .where(dsql`${schema.feedbackReplies.feedbackId} = ANY(${ids})`)
      .groupBy(schema.feedbackReplies.feedbackId);
    for (const r of latest) {
      latestMap.set(r.feedbackId, r);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pb-20">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pt-10 pb-12 md:px-8 md:pt-14">
          <header className="space-y-2">
            <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
              Threads
            </p>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              My feedback
            </h1>
            <p className="text-sm text-stone-600">
              Conversations with the Petdex team about feedback you've sent.
            </p>
          </header>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm text-stone-600">
              You haven't sent any feedback yet. Use the Feedback button to share thoughts.
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => {
                const meta = KIND_META[r.kind] ?? KIND_META.other;
                const statusMeta = STATUS_META[r.status] ?? STATUS_META.pending;
                const agg = latestMap.get(r.id);
                const lastAdminAt = agg?.latestAdminAt ?? null;
                const userLastReadAt = r.userLastReadAt;
                const unread =
                  lastAdminAt &&
                  (!userLastReadAt ||
                    new Date(lastAdminAt) > new Date(userLastReadAt));
                const replyCount = agg?.replyCount ?? 0;

                return (
                  <li key={r.id}>
                    <Link
                      href={`/my-feedback/${r.id}`}
                      className="block rounded-2xl border border-black/10 bg-white/80 p-4 transition hover:border-black/30 hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase ring-1 ${meta.tone}`}
                            >
                              {meta.icon}
                              {meta.label}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase ring-1 ${statusMeta.tone}`}
                            >
                              {statusMeta.label}
                            </span>
                            {unread ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#5266ea] px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-white uppercase">
                                New reply
                              </span>
                            ) : null}
                            <span className="ml-auto font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-800">
                            {r.message}
                          </p>
                          {replyCount > 0 ? (
                            <p className="mt-2 text-xs text-stone-500">
                              {replyCount} {replyCount === 1 ? "reply" : "replies"}
                              {lastAdminAt
                                ? ` · last from Hunter ${new Date(lastAdminAt).toLocaleDateString()}`
                                : ""}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-stone-400">
                              No replies yet
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
