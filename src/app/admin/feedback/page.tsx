import Link from "next/link";

import { clerkClient } from "@clerk/nextjs/server";
import { desc, inArray, sql as dsql } from "drizzle-orm";
import {
  Bug,
  ExternalLink,
  Heart,
  Lightbulb,
  Mail,
  MessageSquare,
  UserSquare,
} from "lucide-react";

import { AdminFeedbackActions } from "@/components/admin-feedback-actions";
import { AdminFeedbackFilters } from "@/components/admin-feedback-filters";
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

const STATUS_META: Record<
  string,
  { label: string; tone: string }
> = {
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

type ClerkInfo = {
  imageUrl: string | null;
  displayName: string | null;
  username: string | null;
  // Resolved /u/<handle> path component. Username when set, fallback
  // to last 8 chars of the userId so every signed-in author has a
  // public profile we can link to.
  handle: string;
  primaryEmail: string | null;
  externalUrls: string[];
  emails: string[];
  createdAt: number | null;
};

async function loadClerkInfo(
  userIds: string[],
): Promise<Map<string, ClerkInfo>> {
  const out = new Map<string, ClerkInfo>();
  if (userIds.length === 0) return out;
  let client: Awaited<ReturnType<typeof clerkClient>>;
  try {
    client = await clerkClient();
  } catch {
    return out;
  }
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 100) {
    chunks.push(userIds.slice(i, i + 100));
  }
  for (const ids of chunks) {
    try {
      const list = await client.users.getUserList({ userId: ids, limit: 100 });
      for (const u of list.data) {
        const primary = u.emailAddresses.find(
          (e) => e.id === u.primaryEmailAddressId,
        );
        const displayName = [u.firstName, u.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const externalUrls: string[] = [];
        for (const acc of u.externalAccounts ?? []) {
          const username = (acc as { username?: string }).username;
          if (!username) continue;
          if (acc.provider === "oauth_github") {
            externalUrls.push(`https://github.com/${username}`);
          } else if (
            acc.provider === "oauth_x" ||
            acc.provider === "oauth_twitter"
          ) {
            externalUrls.push(`https://x.com/${username}`);
          }
        }
        out.set(u.id, {
          imageUrl: u.imageUrl ?? null,
          displayName: displayName || null,
          username: u.username ?? null,
          handle: u.username
            ? u.username.toLowerCase()
            : u.id.slice(-8).toLowerCase(),
          primaryEmail: primary?.emailAddress?.toLowerCase() ?? null,
          externalUrls,
          emails: u.emailAddresses.map((e) => e.emailAddress.toLowerCase()),
          createdAt: u.createdAt ?? null,
        });
      }
    } catch {
      /* swallow — admin still sees raw rows */
    }
  }
  return out;
}

type SP = { status?: string; kind?: string };

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const statusFilter = (sp.status ?? "pending") as
    | "pending"
    | "addressed"
    | "archived"
    | "all";
  const kindFilter = (sp.kind ?? "all") as
    | "all"
    | "suggestion"
    | "bug"
    | "praise"
    | "other";

  const rows = await db
    .select()
    .from(schema.feedback)
    .orderBy(desc(schema.feedback.createdAt))
    .limit(500);

  const statusCounts = {
    pending: rows.filter((r) => r.status === "pending").length,
    addressed: rows.filter((r) => r.status === "addressed").length,
    archived: rows.filter((r) => r.status === "archived").length,
    all: rows.length,
  };
  const kindCounts = {
    all: rows.length,
    suggestion: rows.filter((r) => r.kind === "suggestion").length,
    bug: rows.filter((r) => r.kind === "bug").length,
    praise: rows.filter((r) => r.kind === "praise").length,
    other: rows.filter((r) => r.kind === "other").length,
  };

  const visible = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (kindFilter !== "all" && r.kind !== kindFilter) return false;
    return true;
  });

  const userIds = [
    ...new Set(visible.map((r) => r.userId).filter((v): v is string => !!v)),
  ];
  const clerkInfo = await loadClerkInfo(userIds);

  // Reply counts + last user reply per visible thread (for unread dot).
  const visibleIds = visible.map((r) => r.id);
  type Agg = {
    feedbackId: string;
    replyCount: number;
    lastUserReplyAt: Date | null;
  };
  const aggMap = new Map<string, Agg>();
  if (visibleIds.length > 0) {
    const aggRows = await db
      .select({
        feedbackId: schema.feedbackReplies.feedbackId,
        replyCount: dsql<number>`COUNT(*)::int`,
        lastUserReplyAt: dsql<Date | null>`MAX(${schema.feedbackReplies.createdAt}) FILTER (WHERE ${schema.feedbackReplies.authorKind} = 'user')`,
      })
      .from(schema.feedbackReplies)
      .where(inArray(schema.feedbackReplies.feedbackId, visibleIds))
      .groupBy(schema.feedbackReplies.feedbackId);
    for (const r of aggRows) aggMap.set(r.feedbackId, r);
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-12 md:px-8 md:pb-16">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
          Inbox
        </p>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          Feedback
        </h1>
        <AdminFeedbackFilters
          statusCounts={statusCounts}
          kindCounts={kindCounts}
        />
      </header>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm text-stone-600 dark:border-white/15 dark:bg-stone-900/60 dark:text-stone-400">
          No feedback in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => {
            const meta = KIND_META[r.kind] ?? KIND_META.other;
            const statusMeta = STATUS_META[r.status] ?? STATUS_META.pending;
            const info = (r.userId ? clerkInfo.get(r.userId) : null) ?? null;
            const replyEmail = r.email ?? info?.primaryEmail ?? null;
            const subjectExcerpt = r.message.slice(0, 50).replace(/\s+/g, " ");
            const mailtoBody = encodeURIComponent(
              `Hey,\n\nThanks for the ${r.kind} on Petdex —\n\n> ${r.message
                .split("\n")
                .map((l) => l)
                .join("\n> ")}\n\n— Hunter`,
            );
            const mailtoSubject = encodeURIComponent(
              `Re: your Petdex feedback — ${subjectExcerpt}${r.message.length > 50 ? "…" : ""}`,
            );
            const mailtoHref = replyEmail
              ? `mailto:${replyEmail}?subject=${mailtoSubject}&body=${mailtoBody}`
              : null;
            const agg = aggMap.get(r.id);
            const replyCount = agg?.replyCount ?? 0;
            const lastUserAt = agg?.lastUserReplyAt ?? null;
            const adminUnread =
              lastUserAt &&
              (!r.adminLastReadAt ||
                new Date(lastUserAt) > new Date(r.adminLastReadAt));

            const displayName =
              info?.displayName ??
              info?.username ??
              (r.email ? r.email.split("@")[0] : "Anonymous");

            return (
              <li
                key={r.id}
                className={`rounded-xl border bg-white/80 px-4 py-3 backdrop-blur transition ${
                  r.status === "archived"
                    ? "border-black/5 opacity-70"
                    : "border-black/10"
                } dark:bg-stone-900/80`}
              >
                {/* Top row: identity + tags on left, action cluster on right */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar info={info} email={r.email} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                          {displayName}
                        </span>
                        {info?.username ? (
                          <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">
                            @{info.username}
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase ring-1 ${meta.tone}`}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase ring-1 ${statusMeta.tone}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">
                          {new Date(r.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                        {replyEmail ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            {replyEmail}
                            {!r.email && info?.primaryEmail ? (
                              <span className="text-[10px] text-stone-400 dark:text-stone-500">
                                (clerk)
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                        {r.pageUrl ? (
                          <a
                            href={r.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 underline-offset-2 hover:text-stone-800 hover:underline dark:hover:text-stone-200"
                          >
                            <ExternalLink className="size-3" />
                            {(() => {
                              try {
                                return new URL(r.pageUrl).pathname;
                              } catch {
                                return r.pageUrl;
                              }
                            })()}
                          </a>
                        ) : null}
                        {info?.externalUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 underline-offset-2 hover:text-stone-800 hover:underline dark:hover:text-stone-200"
                          >
                            <ExternalLink className="size-3" />
                            {url.replace(/^https?:\/\//, "")}
                          </a>
                        )) ?? null}
                      </div>
                    </div>
                  </div>

                  {/* Actions: single horizontal row */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/admin/feedback/${r.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#5266ea] px-3 text-xs font-medium text-white transition hover:bg-[#3847f5]"
                    >
                      <MessageSquare className="size-3.5" />
                      {replyCount > 0
                        ? `Thread (${replyCount})`
                        : "Thread"}
                      {adminUnread ? (
                        <span className="ml-0.5 size-1.5 rounded-full bg-white dark:bg-stone-900" />
                      ) : null}
                    </Link>
                    {info?.handle ? (
                      <Link
                        href={`/u/${info.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        title={`View @${info.handle}'s profile`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 text-[11px] text-stone-600 transition hover:border-black/30 hover:text-stone-900 dark:border-white/10 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-white/30 dark:hover:text-stone-100"
                      >
                        <UserSquare className="size-3" />
                        Profile
                      </Link>
                    ) : null}
                    {mailtoHref ? (
                      <a
                        href={mailtoHref}
                        title="Send email instead"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-black/10 bg-white text-stone-600 transition hover:border-black/30 hover:text-stone-900 dark:border-white/10 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-white/30 dark:hover:text-stone-100"
                      >
                        <Mail className="size-3.5" />
                      </a>
                    ) : null}
                    <AdminFeedbackActions id={r.id} status={r.status} />
                  </div>
                </div>

                {/* Message */}
                <p className="mt-2.5 text-sm leading-6 whitespace-pre-wrap text-stone-800 dark:text-stone-200">
                  {r.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Avatar({
  info,
  email,
}: {
  info: ClerkInfo | null;
  email: string | null;
}) {
  if (info?.imageUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: Clerk avatar URL allowlisted in CSP
      <img
        src={info.imageUrl}
        alt=""
        className="size-8 shrink-0 rounded-full ring-1 ring-black/10"
      />
    );
  }
  const seed = info?.displayName ?? info?.username ?? email ?? "?";
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-200 font-mono text-xs font-semibold text-stone-700 ring-1 ring-black/10 dark:bg-stone-700 dark:text-stone-300">
      {seed.slice(0, 1).toUpperCase()}
    </div>
  );
}
