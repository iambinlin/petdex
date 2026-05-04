import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";

import { db, schema } from "@/lib/db/client";
import { embedQuery } from "@/lib/query-embed";
import { petRequestRatelimit } from "@/lib/ratelimit";
import { requireSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rawSql = neon(process.env.DATABASE_URL ?? "");

function normalize(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .slice(0, 200);
}

// GET — list top requests (paged by upvote count).
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
  const status = url.searchParams.get("status") ?? "open";

  const rows = await db
    .select({
      id: schema.petRequests.id,
      query: schema.petRequests.query,
      upvoteCount: schema.petRequests.upvoteCount,
      status: schema.petRequests.status,
      fulfilledPetSlug: schema.petRequests.fulfilledPetSlug,
      createdAt: schema.petRequests.createdAt,
    })
    .from(schema.petRequests)
    .where(eq(schema.petRequests.status, status))
    .orderBy(sql`${schema.petRequests.upvoteCount} DESC, ${schema.petRequests.createdAt} DESC`)
    .limit(limit);

  // Tell the caller which ones they've already upvoted (UI state).
  const { userId } = await auth();
  let myVotes: Set<string> = new Set();
  if (userId && rows.length > 0) {
    const v = await db
      .select({ requestId: schema.petRequestVotes.requestId })
      .from(schema.petRequestVotes)
      .where(eq(schema.petRequestVotes.userId, userId));
    myVotes = new Set(v.map((r) => r.requestId));
  }

  return NextResponse.json({
    requests: rows.map((r) => ({
      ...r,
      voted: myVotes.has(r.id),
    })),
  });
}

// POST — create a new request OR upvote an existing one if the
// normalized query already exists.
export async function POST(req: Request): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lim = await petRequestRatelimit.limit(userId);
  if (!lim.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { query?: string };
  try {
    body = (await req.json()) as { query?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query || query.length < 4 || query.length > 200) {
    return NextResponse.json(
      { error: "query_length", message: "Use 4-200 characters." },
      { status: 400 },
    );
  }

  const normalized = normalize(query);

  // Dedup: if a request with the same normalized text exists, just upvote.
  const existing = await db.query.petRequests.findFirst({
    where: eq(schema.petRequests.normalized, normalized),
  });

  if (existing) {
    // Upsert vote — primary key (request_id, user_id) makes this idempotent.
    const before = existing.upvoteCount;
    await rawSql`
      INSERT INTO pet_request_votes (request_id, user_id)
      VALUES (${existing.id}, ${userId})
      ON CONFLICT DO NOTHING
    `;
    const recount = (await rawSql`
      SELECT count(*)::int as c FROM pet_request_votes WHERE request_id = ${existing.id}
    `) as Array<{ c: number }>;
    await db
      .update(schema.petRequests)
      .set({ upvoteCount: recount[0]?.c ?? before, updatedAt: new Date() })
      .where(eq(schema.petRequests.id, existing.id));
    return NextResponse.json({
      ok: true,
      mode: "upvoted",
      id: existing.id,
      upvoteCount: recount[0]?.c ?? before,
    });
  }

  // Create new request.
  const id = `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const vec = await embedQuery(query).catch(() => null);

  await db.insert(schema.petRequests).values({
    id,
    query,
    normalized,
    requestedBy: userId,
  });
  if (vec) {
    const literal = `[${vec.join(",")}]`;
    await rawSql`
      UPDATE pet_requests SET embedding = ${literal}::vector WHERE id = ${id}
    `;
  }
  // First vote = creator's own.
  await rawSql`
    INSERT INTO pet_request_votes (request_id, user_id)
    VALUES (${id}, ${userId})
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({
    ok: true,
    mode: "created",
    id,
    upvoteCount: 1,
  });
}
