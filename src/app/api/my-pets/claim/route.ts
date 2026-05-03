import { NextResponse } from "next/server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

// GET — list pets that look claimable for the signed-in user. A pet is
// claimable when:
//   - its owner_email equals the user's verified primary email
//   - its owner_id differs from the user's current Clerk userId
// We never auto-transfer on submit. The user has to opt in here.
export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const verifiedEmail = await getVerifiedPrimaryEmail(userId);
  if (!verifiedEmail) {
    return NextResponse.json({ pets: [] });
  }

  const rows = await db
    .select({
      id: schema.submittedPets.id,
      slug: schema.submittedPets.slug,
      displayName: schema.submittedPets.displayName,
      status: schema.submittedPets.status,
      createdAt: schema.submittedPets.createdAt,
    })
    .from(schema.submittedPets)
    .where(
      and(
        eq(schema.submittedPets.ownerEmail, verifiedEmail),
        ne(schema.submittedPets.ownerId, userId),
      ),
    );

  return NextResponse.json({ pets: rows, email: verifiedEmail });
}

// POST — claim a single pet by id. Same checks as the listing query, plus
// the explicit user click serves as confirmation.
export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const verifiedEmail = await getVerifiedPrimaryEmail(userId);
  if (!verifiedEmail) {
    return NextResponse.json(
      {
        error: "email_not_verified",
        message: "Verify your primary email in Clerk before claiming pets.",
      },
      { status: 403 },
    );
  }

  const row = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.id, id),
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.ownerId === userId) {
    return NextResponse.json({ ok: true, alreadyOwned: true });
  }
  if (
    !row.ownerEmail ||
    row.ownerEmail.toLowerCase() !== verifiedEmail.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "email_mismatch" },
      { status: 403 },
    );
  }

  await db
    .update(schema.submittedPets)
    .set({ ownerId: userId })
    .where(eq(schema.submittedPets.id, id));

  return NextResponse.json({ ok: true, slug: row.slug });
}

async function getVerifiedPrimaryEmail(
  userId: string,
): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const addr = user.emailAddresses.find((e) => e.id === primaryId);
    if (!addr) return null;
    if (addr.verification?.status !== "verified") return null;
    return addr.emailAddress.toLowerCase();
  } catch {
    return null;
  }
}
