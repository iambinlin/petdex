import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

type Params = { id: string };

type PatchBody = {
  action: "approve" | "reject" | "edit";
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
    body.action !== "edit"
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
        : {};

  const update = { ...editPatch, ...statusPatch };

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "nothing_to_update" },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(schema.submittedPets)
    .set(update)
    .where(eq(schema.submittedPets.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Notify owner only on status change (approve/reject), not pure edits.
  const shouldNotify =
    body.action === "approve" || body.action === "reject";
  if (shouldNotify && row.ownerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM ?? "Petdex <petdex@updates.railly.dev>";
      const url = `https://petdex.crafter.run/pets/${row.slug}`;
      const installCmd = `curl -sSf https://petdex.crafter.run/install/${row.slug} | sh`;

      if (row.status === "approved") {
        await resend.emails.send({
          from,
          to: row.ownerEmail,
          subject: `${row.displayName} is live on Petdex`,
          text: [
            `Your pet "${row.displayName}" is now live on Petdex.`,
            "",
            `Page:    ${url}`,
            "",
            "Anyone can install it with:",
            `  ${installCmd}`,
            "",
            "Thanks for shipping a pet,",
            "Petdex",
          ].join("\n"),
        });
      } else if (row.status === "rejected") {
        await resend.emails.send({
          from,
          to: row.ownerEmail,
          subject: `Your Petdex submission needs changes — ${row.displayName}`,
          text: [
            `Hey, your pet "${row.displayName}" wasn't approved this round.`,
            "",
            row.rejectionReason
              ? `Reason: ${row.rejectionReason}`
              : "No reason was provided. Feel free to iterate and resubmit.",
            "",
            "You can submit a revised version at https://petdex.crafter.run/submit",
            "",
            "Petdex",
          ].join("\n"),
        });
      }
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({ ok: true, status: row.status });
}
