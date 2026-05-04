import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gt, sql as dsql } from "drizzle-orm";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

// GET /api/feedback/unread → { count } where:
// - For the original author: number of feedback rows that have at least
//   one admin reply newer than userLastReadAt (or no userLastReadAt yet).
// - For admins: number of feedback rows with at least one user reply newer
//   than adminLastReadAt.
// - Otherwise: 0.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ count: 0 });
  }

  const admin = isAdmin(userId);

  if (admin) {
    // For admins: any feedback whose latest user reply is newer than adminLastReadAt
    const rows = await db
      .select({
        feedbackId: schema.feedbackReplies.feedbackId,
        latestUserReply: dsql<Date>`MAX(${schema.feedbackReplies.createdAt})`,
        adminLastReadAt: schema.feedback.adminLastReadAt,
      })
      .from(schema.feedbackReplies)
      .innerJoin(
        schema.feedback,
        eq(schema.feedback.id, schema.feedbackReplies.feedbackId),
      )
      .where(eq(schema.feedbackReplies.authorKind, "user"))
      .groupBy(
        schema.feedbackReplies.feedbackId,
        schema.feedback.adminLastReadAt,
      );

    const count = rows.filter(
      (r) =>
        !r.adminLastReadAt ||
        new Date(r.latestUserReply) > new Date(r.adminLastReadAt),
    ).length;
    return NextResponse.json({ count, role: "admin" });
  }

  // For original authors
  const myFeedback = await db
    .select({ id: schema.feedback.id, userLastReadAt: schema.feedback.userLastReadAt })
    .from(schema.feedback)
    .where(eq(schema.feedback.userId, userId));

  if (myFeedback.length === 0) {
    return NextResponse.json({ count: 0, role: "user" });
  }

  const ids = myFeedback.map((r) => r.id);
  const adminReplies = await db
    .select({
      feedbackId: schema.feedbackReplies.feedbackId,
      latestAdminReply: dsql<Date>`MAX(${schema.feedbackReplies.createdAt})`,
    })
    .from(schema.feedbackReplies)
    .where(
      and(
        eq(schema.feedbackReplies.authorKind, "admin"),
        dsql`${schema.feedbackReplies.feedbackId} = ANY(${ids})`,
      ),
    )
    .groupBy(schema.feedbackReplies.feedbackId);

  const lastReadById = new Map(
    myFeedback.map((r) => [r.id, r.userLastReadAt]),
  );
  const count = adminReplies.filter((r) => {
    const lastRead = lastReadById.get(r.feedbackId);
    return !lastRead || new Date(r.latestAdminReply) > new Date(lastRead);
  }).length;

  return NextResponse.json({ count, role: "user" });
}
