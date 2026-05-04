import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

import { FeedbackThread } from "@/components/feedback-thread";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback thread",
  robots: { index: false, follow: false },
};

type Params = { id: string; locale: string };

export default async function MyFeedbackThreadPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const { id } = await params;
  const row = await db.query.feedback.findFirst({
    where: eq(schema.feedback.id, id),
  });
  if (!row || row.userId !== userId) notFound();

  const replies = await db
    .select()
    .from(schema.feedbackReplies)
    .where(eq(schema.feedbackReplies.feedbackId, id))
    .orderBy(asc(schema.feedbackReplies.createdAt));

  // Mark the thread as read for this user.
  await db
    .update(schema.feedback)
    .set({ userLastReadAt: new Date() })
    .where(eq(schema.feedback.id, id));

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pb-20">
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-10 pb-12 md:px-8 md:pt-14">
          <Link
            href="/my-feedback"
            className="font-mono text-[11px] tracking-[0.18em] text-muted-3 uppercase hover:text-stone-900 dark:hover:text-stone-100"
          >
            ← All threads
          </Link>
          <FeedbackThread
            feedback={{
              id: row.id,
              kind: row.kind,
              status: row.status,
              message: row.message,
              createdAt: row.createdAt.toISOString(),
              notifyEmail: row.notifyEmail,
            }}
            initialReplies={replies.map((r) => ({
              id: r.id,
              authorKind: r.authorKind,
              body: r.body,
              createdAt: r.createdAt.toISOString(),
            }))}
            viewerKind="user"
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
