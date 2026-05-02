import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";

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

  const now = new Date();
  const update =
    body.action === "approve"
      ? {
          status: "approved" as const,
          approvedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        }
      : {
          status: "rejected" as const,
          rejectedAt: now,
          approvedAt: null,
          rejectionReason: body.reason?.trim() || null,
        };

  const [row] = await db
    .update(schema.submittedPets)
    .set(update)
    .where(eq(schema.submittedPets.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Notify owner — silent fail
  if (row.ownerEmail && process.env.RESEND_API_KEY) {
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
