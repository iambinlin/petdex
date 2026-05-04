import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pets/random?exclude=current-slug
//
// Picks a random approved pet (excluding the optional `exclude` slug).
// Behaviour depends on the Accept header:
//   - Accept: application/json -> JSON `{ slug }` payload (used by the
//     keyboard shortcut so the client can router.push without an
//     opaque 302 redirect).
//   - default                  -> 302 to /pets/<slug> (used by the
//     plain <a href> shuffle pill so a click without JS still works).
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const exclude = url.searchParams.get("exclude") ?? "";
  const wantsJson = (req.headers.get("accept") ?? "").includes(
    "application/json",
  );

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

  if (wantsJson) {
    if (!next) {
      return NextResponse.json(
        { error: "no pets available" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { slug: next, href: `/pets/${next}` },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (!next) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
  return NextResponse.redirect(new URL(`/pets/${next}`, req.url), 302);
}
