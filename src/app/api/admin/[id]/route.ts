import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { isAdmin } from "@/lib/admin";
import { classifyPet } from "@/lib/auto-tag";
import { classifyColorFamily, extractDominantColor } from "@/lib/color-extract";
import { db, schema } from "@/lib/db/client";
import { renderSubmissionApprovedEmail } from "@/lib/email-templates/submission-approved";
import { renderSubmissionRejectedEmail } from "@/lib/email-templates/submission-rejected";
import { renderSubmissionTakedownEmail } from "@/lib/email-templates/submission-takedown";
import { createNotification } from "@/lib/notifications";
import {
  getApprovedPetMissingSoundBySlug,
  processPetSound,
} from "@/lib/pet-sound";
import { deleteR2Objects, keyFromR2Url } from "@/lib/r2";
import { requireSameOrigin } from "@/lib/same-origin";
import { refreshSimilarityFor } from "@/lib/similarity";
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

  const now = new Date();
  const editPatch: Record<string, unknown> = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    editPatch.displayName = body.displayName.trim().slice(0, 60);
  }
  if (typeof body.description === "string" && body.description.trim()) {
    editPatch.description = body.description.trim().slice(0, 280);
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    const newSlug = body.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (newSlug) {
      const existing = await db.query.submittedPets.findFirst({
        where: eq(schema.submittedPets.slug, newSlug),
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "slug_taken", message: `"${newSlug}" already exists.` },
          { status: 409 },
        );
      }
      editPatch.slug = newSlug;
    }
  }

  const statusPatch =
    body.action === "approve"
      ? {
          status: "approved" as const,
          approvedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        }
      : body.action === "reject"
        ? {
            status: "rejected" as const,
            rejectedAt: now,
            approvedAt: null,
            rejectionReason: body.reason?.trim() || null,
          }
        : body.action === "pending"
          ? {
              // Revive: clear approval / rejection and let it sit in the
              // queue again. Useful for second-look on rejected rows.
              status: "pending" as const,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
            }
          : {};

  const update = { ...editPatch, ...statusPatch };

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const [row] = await db
    .update(schema.submittedPets)
    .set(update)
    .where(eq(schema.submittedPets.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Auto-tag freshly-approved pets that are still on the default empty state.
  // Best effort — failures don't block the approve, the pet just stays
  // un-tagged and the manual `bun scripts/auto-tag.ts` can backfill later.
  if (body.action === "approve") {
    const needsTagging =
      ((row.tags as string[]) ?? []).length === 0 ||
      ((row.vibes as string[]) ?? []).length === 0;
    if (needsTagging) {
      const cls = await classifyPet(row.displayName, row.description);
      if (cls) {
        const [tagged] = await db
          .update(schema.submittedPets)
          .set({ kind: cls.kind, vibes: cls.vibes, tags: cls.tags })
          .where(eq(schema.submittedPets.id, row.id))
          .returning();
        if (tagged) {
          row.kind = tagged.kind;
          row.vibes = tagged.vibes;
          row.tags = tagged.tags;
        }
      }
    }
    // Fire-and-forget similarity refresh so the next admin queue load
    // can match this pet against everything else. Logs warning on
    // failure; never blocks the approve response.
    void refreshSimilarityFor(row.id).catch((err) => {
      console.warn("[approve] similarity refresh failed:", err);
    });

    if (!row.dominantColor) {
      void (async () => {
        try {
          const dominantColor = await extractDominantColor(row.spritesheetUrl);
          if (!dominantColor) return;

          await db
            .update(schema.submittedPets)
            .set({
              dominantColor,
              colorFamily: classifyColorFamily(dominantColor),
            })
            .where(eq(schema.submittedPets.id, row.id));
        } catch (e) {
          console.error("color extract failed", e);
        }
      })();
    }

    void (async () => {
      try {
        const pet = await getApprovedPetMissingSoundBySlug(row.slug);
        if (!pet) return;
        await processPetSound(pet, { workerKey: `approve-${row.slug}` });
      } catch (e) {
        console.error("sound gen failed", e);
      }
    })();
  }

  // Notify owner only on status change (approve/reject), not pure edits.
  const shouldNotify = body.action === "approve" || body.action === "reject";

  // In-app notification (best-effort). Independent of email so muted
  // inboxes still see the bell.
  if (shouldNotify) {
    void createNotification({
      userId: row.ownerId,
      kind: row.status === "approved" ? "pet_approved" : "pet_rejected",
      payload: {
        petSlug: row.slug,
        petName: row.displayName,
        ...(row.rejectionReason ? { reason: row.rejectionReason } : {}),
      },
      href: row.status === "approved" ? `/pets/${row.slug}` : "/",
    }).catch(() => {});
  }

  if (shouldNotify && row.ownerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from =
        process.env.RESEND_FROM ?? "Petdex <petdex@updates.railly.dev>";
      const locale = await getPreferredLocaleForUser(row.ownerId);

      if (row.status === "approved") {
        const email = renderSubmissionApprovedEmail(locale, {
          petName: row.displayName,
          petSlug: row.slug,
        });
        await resend.emails.send({
          from,
          to: row.ownerEmail,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      } else if (row.status === "rejected") {
        const email = renderSubmissionRejectedEmail(locale, {
          petName: row.displayName,
          reason: row.rejectionReason,
        });
        await resend.emails.send({
          from,
          to: row.ownerEmail,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({ ok: true, status: row.status });
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
