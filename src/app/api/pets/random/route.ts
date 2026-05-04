import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pets/random?exclude=current-slug
//
// Picks a random approved pet (excluding the optional `exclude` slug) and
// 302s to /pets/<slug>. Used by the shuffle button + spacebar shortcut on
// the detail page so the client never needs the full catalog.
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const exclude = url.searchParams.get("exclude") ?? "";

  // SELECT a single random approved, non-discover pet. Skip the current
  // one when exclude is present so spamming spacebar always lands on a
  // different pet. ORDER BY random() is fine at our catalog size (~440
  // rows) — it's a one-shot index scan, not a hot path.
  const rows = await db
    .select({ slug: schema.submittedPets.slug })
    .from(schema.submittedPets)
    .where(
      exclude
        ? sql`${schema.submittedPets.status} = 'approved'
              AND ${schema.submittedPets.source} <> 'discover'
              AND ${schema.submittedPets.slug} <> ${exclude}`
        : sql`${schema.submittedPets.status} = 'approved'
              AND ${schema.submittedPets.source} <> 'discover'`,
    )
    .orderBy(sql`random()`)
    .limit(1);

  const next = rows[0]?.slug;
  if (!next) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  return NextResponse.redirect(new URL(`/pets/${next}`, req.url), 302);
}
