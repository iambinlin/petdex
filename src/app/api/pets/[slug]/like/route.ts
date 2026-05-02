import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { setLikeCount } from "@/lib/db/metrics";

export const runtime = "nodejs";

type Params = { slug: string };

export async function POST(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await ctx.params;

  const existing = await db.query.petLikes.findFirst({
    where: and(
      eq(schema.petLikes.userId, userId),
      eq(schema.petLikes.petSlug, slug),
    ),
  });

  let liked: boolean;
  if (existing) {
    await db
      .delete(schema.petLikes)
      .where(
        and(
          eq(schema.petLikes.userId, userId),
          eq(schema.petLikes.petSlug, slug),
        ),
      );
    liked = false;
  } else {
    await db.insert(schema.petLikes).values({ userId, petSlug: slug });
    liked = true;
  }

  // Recompute count to avoid drift
  const countRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(schema.petLikes)
    .where(eq(schema.petLikes.petSlug, slug));
  const count = Number(countRow[0]?.c ?? 0);
  await setLikeCount(slug, count);

  return NextResponse.json({ ok: true, liked, count });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const { userId } = await auth();
  const { slug } = await ctx.params;

  const countRow = await db
    .select({ c: sql<number>`count(*)` })
    .from(schema.petLikes)
    .where(eq(schema.petLikes.petSlug, slug));
  const count = Number(countRow[0]?.c ?? 0);

  let liked = false;
  if (userId) {
    const row = await db.query.petLikes.findFirst({
      where: and(
        eq(schema.petLikes.userId, userId),
        eq(schema.petLikes.petSlug, slug),
      ),
    });
    liked = Boolean(row);
  }

  return NextResponse.json({ count, liked });
}
