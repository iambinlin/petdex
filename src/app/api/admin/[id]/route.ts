import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { isAdmin } from "@/lib/admin";
import { requireSameOrigin } from "@/lib/same-origin";
import { applySubmissionAction } from "@/lib/submission-decisions";

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
