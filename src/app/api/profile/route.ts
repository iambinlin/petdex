import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { profileEditRatelimit } from "@/lib/ratelimit";
import { requireSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";

type PatchBody = {
  bio?: string | null;
  featuredPetSlug?: string | null;
};

export async function PATCH(req: Request): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const lim = await profileEditRatelimit.limit(userId);
  if (!lim.success) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: lim.reset },
      { status: 429 },
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: { bio?: string | null; featuredPetSlug?: string | null } = {};

  if (body.bio !== undefined) {
    if (body.bio === null || body.bio === "") {
      patch.bio = null;
    } else if (typeof body.bio === "string") {
      const v = body.bio.trim().slice(0, 280);
      patch.bio = v.length > 0 ? v : null;
    } else {
      return NextResponse.json({ error: "invalid_bio" }, { status: 400 });
    }
  }

  if (body.featuredPetSlug !== undefined) {
    if (body.featuredPetSlug === null || body.featuredPetSlug === "") {
      patch.featuredPetSlug = null;
    } else if (typeof body.featuredPetSlug === "string") {
      const slug = body.featuredPetSlug.trim().toLowerCase();
      // Verify the slug belongs to an approved pet owned by this user.
      const owned = await db.query.submittedPets.findFirst({
        where: and(
          eq(schema.submittedPets.slug, slug),
          eq(schema.submittedPets.ownerId, userId),
          eq(schema.submittedPets.status, "approved"),
        ),
      });
      if (!owned) {
        return NextResponse.json(
          { error: "pet_not_owned_or_not_approved" },
          { status: 400 },
        );
      }
      patch.featuredPetSlug = slug;
    } else {
      return NextResponse.json({ error: "invalid_featured" }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "nothing_to_update" },
      { status: 400 },
    );
  }

  // Upsert.
  await db
    .insert(schema.userProfiles)
    .values({
      userId,
      bio: patch.bio ?? null,
      featuredPetSlug: patch.featuredPetSlug ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userProfiles.userId,
      set: {
        ...patch,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
