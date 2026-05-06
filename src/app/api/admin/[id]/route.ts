import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";
import { renderSubmissionTakedownEmail } from "@/lib/email-templates/submission-takedown";
import { createNotification } from "@/lib/notifications";
import { deleteR2Objects, keyFromR2Url } from "@/lib/r2";
import { requireSameOrigin } from "@/lib/same-origin";
import { applySubmissionAction } from "@/lib/submission-decisions";
import { getPreferredLocaleForUser } from "@/lib/user-locale";

export const runtime = "nodejs";

type Params = { id: string };

type PatchBody = {
  // 'pending' revives a previously rejected row back into the queue.
  action: "approve" | "reject" | "edit" | "pending";
  reason?: string | null;
  // edit-only fields (also accepted on approve to combine in one request)
  displayName?: string;
  description?: string;
  slug?: string;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    body.action !== "approve" &&
    body.action !== "reject" &&
    body.action !== "edit" &&
    body.action !== "pending"
  ) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const result = await applySubmissionAction(id, body, { actor: "admin" });
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json({ ok: true, status: result.row.status });
}

// Hard takedown. Removes the pet row, every cross-table reference that
// stores its slug, and every R2 asset uploaded for the submission. The
// slug is freed so the original author (or anyone else) can re-submit.
//
// Use case: rights-holder asks to take down their own pet, DMCA, or
// any other reason where rejecting + leaving the row around isn't
// enough. For routine "this submission isn't a fit" cases prefer
// PATCH action: 'reject' so the audit trail stays.
type DeleteBody = {
  reason?: string | null;
};

export async function DELETE(
  req: Request,
  ctx: { params: Promise<Params> },
): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: DeleteBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as DeleteBody;
  } catch {
    body = {};
  }
  const reason = body.reason?.trim() || null;

  const pet = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.id, id),
  });
  if (!pet) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const slug = pet.slug;

  // 1. Cross-table cleanup keyed by slug. None of these have FKs to
  //    submitted_pets so they have to go by hand.
  await db.delete(schema.petLikes).where(eq(schema.petLikes.petSlug, slug));
  await db.delete(schema.petMetrics).where(eq(schema.petMetrics.petSlug, slug));
  await db
    .delete(schema.petCollectionItems)
    .where(eq(schema.petCollectionItems.petSlug, slug));
  await db
    .delete(schema.petCollectionRequests)
    .where(eq(schema.petCollectionRequests.petSlug, slug));

  // 2. Null out collections that used this pet as their cover.
  await db
    .update(schema.petCollections)
    .set({ coverPetSlug: null })
    .where(eq(schema.petCollections.coverPetSlug, slug));

  // 3. Reopen any pet request this submission fulfilled so it goes back
  //    to the queue instead of pointing at a dead slug.
  await db
    .update(schema.petRequests)
    .set({ fulfilledPetSlug: null, status: "open" })
    .where(eq(schema.petRequests.fulfilledPetSlug, slug));

  // 4. Strip the slug from any user_profile featured arrays. We only
  //    touch profiles that actually contain the slug so the jsonb
  //    rewrite stays scoped.
  await db.execute(sql`
    UPDATE user_profiles
    SET featured_pet_slugs = (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(featured_pet_slugs) AS elem
      WHERE elem <> to_jsonb(${slug}::text)
    )
    WHERE featured_pet_slugs @> to_jsonb(${slug}::text)
  `);

  // 5. Drop the row itself.
  await db.delete(schema.submittedPets).where(eq(schema.submittedPets.id, id));

  // 6. Best-effort R2 cleanup. We derive keys from the URLs the
  //    submission stored; anything off-host (legacy or external credit
  //    image) is skipped. R2 errors are logged but don't fail the
  //    takedown — the DB is already gone.
  const keys = [
    keyFromR2Url(pet.spritesheetUrl),
    keyFromR2Url(pet.petJsonUrl),
    keyFromR2Url(pet.zipUrl),
    keyFromR2Url(pet.soundUrl),
  ].filter((k): k is string => Boolean(k));
  try {
    await deleteR2Objects(keys);
  } catch (err) {
    console.warn("[takedown] r2 cleanup failed", { id, slug, err });
  }

  // 7. Notify the owner so they know they can re-submit if needed.
  void createNotification({
    userId: pet.ownerId,
    kind: "pet_rejected",
    payload: {
      petSlug: slug,
      petName: pet.displayName,
      ...(reason ? { reason } : {}),
      takedown: true,
    },
    href: "/",
  }).catch(() => {});

  if (pet.ownerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from =
        process.env.RESEND_FROM ?? "Petdex <petdex@updates.railly.dev>";
      const locale = await getPreferredLocaleForUser(pet.ownerId);
      const email = renderSubmissionTakedownEmail(locale, {
        petName: pet.displayName,
        reason,
      });
      await resend.emails.send({
        from,
        to: pet.ownerEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch {
      /* silent */
    }
  }

  console.info("[takedown] pet removed", {
    id,
    slug,
    by: userId,
    reason,
    keys,
  });

  return NextResponse.json({ ok: true });
}
