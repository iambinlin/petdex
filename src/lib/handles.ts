// Handle <-> userId resolution for /u/[handle] gallery pages.
//
// Source of truth: Clerk's `username`. If a user doesn't have one set, we
// fall back to a deterministic short suffix of their userId so the page
// is always reachable. The suffix is taken from the *end* of the id so
// it's stable across name changes — userIds never get rewritten.

import { clerkClient } from "@clerk/nextjs/server";

const FALLBACK_LENGTH = 8;

function fallbackHandle(userId: string): string {
  return userId.slice(-FALLBACK_LENGTH).toLowerCase();
}

// Forward: userId -> handle. Used to build /u/<handle> URLs from a
// pet's ownerId (e.g. credit chip, /my-pets header).
export async function handleForUser(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    if (u.username) return u.username.toLowerCase();
  } catch {
    /* ignore */
  }
  return fallbackHandle(userId);
}

// Reverse: handle -> userId. Used by the /u/[handle] page to find the
// owner. Returns null if no user matches, so the page can 404.
//
// Strategy: query Clerk by username first (fast path, indexed), then
// fall back to scanning users by id-suffix only when needed. The fallback
// path uses our DB to narrow: any user who has submitted a pet whose
// ownerId ends with the requested suffix.
export async function userIdForHandle(handle: string): Promise<string | null> {
  const normalized = handle.toLowerCase();

  // Fast path: username lookup via Clerk Backend API.
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      username: [normalized],
      limit: 1,
    });
    if (list.data.length > 0) return list.data[0].id;
  } catch {
    /* fall through */
  }

  // Fallback: hex-ish suffix of a userId. Only resolve when the handle
  // matches the FALLBACK_LENGTH and contains only safe characters.
  if (
    normalized.length === FALLBACK_LENGTH &&
    /^[a-z0-9]+$/.test(normalized)
  ) {
    const { db, schema } = await import("@/lib/db/client");
    const { sql } = await import("drizzle-orm");
    const rows = await db
      .selectDistinct({ ownerId: schema.submittedPets.ownerId })
      .from(schema.submittedPets)
      .where(sql`lower(right(${schema.submittedPets.ownerId}, ${FALLBACK_LENGTH})) = ${normalized}`)
      .limit(2);
    // Refuse to resolve if multiple users share the suffix.
    if (rows.length === 1) return rows[0].ownerId;
  }

  return null;
}

// Helper for the few places (e.g. SubmittedBy) that already have a Clerk
// user object cached and just want a handle without a fresh fetch.
export function handleFromClerk(
  user: { username: string | null; id: string },
): string {
  return user.username ? user.username.toLowerCase() : fallbackHandle(user.id);
}
