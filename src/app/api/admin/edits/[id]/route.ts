import { NextResponse } from "next/server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";
import { requireSameOrigin } from "@/lib/same-origin";
import { refreshSimilarityFor } from "@/lib/similarity";

export const runtime = "nodejs";

type Params = { id: string };

type PatchBody = {
  action: "approve" | "reject";
  reason?: string | null;
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

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const row = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.id, id),
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!row.pendingSubmittedAt) {
    return NextResponse.json(
      { error: "no_pending_edit" },
      { status: 400 },
    );
  }

  if (body.action === "approve") {
    const update: Record<string, unknown> = {
      pendingDisplayName: null,
      pendingDescription: null,
      pendingTags: null,
      pendingSubmittedAt: null,
      pendingRejectionReason: null,
    };
    if (row.pendingDisplayName) update.displayName = row.pendingDisplayName;
    if (row.pendingDescription) update.description = row.pendingDescription;
    if (row.pendingTags) update.tags = row.pendingTags;

    const [updated] = await db
      .update(schema.submittedPets)
      .set(update)
      .where(eq(schema.submittedPets.id, id))
      .returning();

    // Refresh embedding/similarity since text changed.
    void refreshSimilarityFor(id).catch(() => {});

    // Notify owner.
    if (process.env.RESEND_API_KEY && updated.ownerEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from =
          process.env.RESEND_FROM ?? "Petdex <petdex@updates.railly.dev>";
        await resend.emails.send({
          from,
          to: updated.ownerEmail,
          subject: `Your edit to ${updated.displayName} is live`,
          text: [
            `Your edit to "${updated.displayName}" was approved.`,
            "",
            `Page: https://petdex.crafter.run/pets/${updated.slug}`,
            "",
            "— Petdex",
          ].join("\n"),
        });
      } catch {
        /* silent */
      }
    }

    return NextResponse.json({ ok: true });
  }

  // reject
  const reason = body.reason?.trim().slice(0, 500) || null;
  const [updated] = await db
    .update(schema.submittedPets)
    .set({
      pendingDisplayName: null,
      pendingDescription: null,
      pendingTags: null,
      pendingSubmittedAt: null,
      pendingRejectionReason: reason,
    })
    .where(eq(schema.submittedPets.id, id))
    .returning();

  // Notify owner with reason. Best-effort; falls back to Clerk primary email.
  let toEmail = updated.ownerEmail ?? null;
  if (!toEmail && updated.ownerId) {
    try {
      const client = await clerkClient();
      const u = await client.users.getUser(updated.ownerId);
      const primary = u.emailAddresses.find(
        (e) => e.id === u.primaryEmailAddressId,
      );
      toEmail = primary?.emailAddress ?? null;
    } catch {
      /* ignore */
    }
  }
  if (process.env.RESEND_API_KEY && toEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from =
        process.env.RESEND_FROM ?? "Petdex <petdex@updates.railly.dev>";
      await resend.emails.send({
        from,
        to: toEmail,
        subject: `Your edit to ${updated.displayName} needs changes`,
        text: [
          `Your edit to "${updated.displayName}" wasn't approved this round.`,
          "",
          reason ? `Reason: ${reason}` : "No reason was provided.",
          "",
          `You can revise it from your pet page: https://petdex.crafter.run/pets/${updated.slug}`,
          "",
          "— Petdex",
        ].join("\n"),
      });
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({ ok: true });
}
