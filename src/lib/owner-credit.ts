// Resolve a pet's "submitted by" credit from Clerk at render time
// instead of the row's frozen credit_* columns.
//
// Why: credit_* gets stale. A user who connects GitHub after submitting
// keeps showing email-prefix as their name forever. The columns stay as
// a fallback for orphan rows (Clerk user deleted, lookup throws, etc.).
//
// API:
//   resolveOwnerCredits([id1, id2, ...]) -> Map<userId, OwnerCredit>
//   resolveOwnerCreditFor(row) -> OwnerCredit (single row convenience)
//
// Both prefer fresh Clerk data; missing fields fall through to whatever
// the row already has, then to a final "anonymous" sentinel.

import { clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";

export type OwnerCredit = {
  // Clerk user id; useful for /u/<handle> links
  userId: string;
  // Public display label, prefer realName -> @username -> email-prefix
  // -> stored row credit -> "anonymous"
  name: string;
  // /u/<handle>; built from username, falls back to last 8 chars of id
  handle: string;
  // External profile (GitHub primary, X fallback) or stored row credit
  url: string | null;
  // Avatar; clerk image first, stored credit second
  imageUrl: string | null;
};

export type RowCreditFallback = {
  ownerId: string;
  creditName: string | null;
  creditUrl: string | null;
  creditImage: string | null;
};

function fallbackHandle(userId: string): string {
  return userId.slice(-8).toLowerCase();
}

function externalUrlFor(
  externalAccounts: Array<{ provider?: string; username?: string }>,
): string | null {
  // Same priority as the original submit flow: GitHub > X. We only fall
  // through if the higher-priority provider has no username set.
  let github: string | null = null;
  let twitter: string | null = null;
  for (const acc of externalAccounts ?? []) {
    if (!acc.username) continue;
    if (acc.provider === "oauth_github" && !github)
      github = `https://github.com/${acc.username}`;
    if (
      (acc.provider === "oauth_x" || acc.provider === "oauth_twitter") &&
      !twitter
    )
      twitter = `https://x.com/${acc.username}`;
  }
  return github ?? twitter;
}

function buildName(
  username: string | null,
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  fallbackName: string | null,
): string {
  const first = firstName?.trim() || null;
  const last = lastName?.trim() || null;
  if (first) {
    return last ? `${first} ${last[0]}.` : first;
  }
  if (username) return username;
  if (email && email.includes("@")) return email.split("@")[0];
  if (fallbackName) return fallbackName;
  return "anonymous";
}

// React cache() ensures one call per render pass — repeated invocations
// with the same input share the underlying Clerk fetch.
export const resolveOwnerCredits = cache(
  async (
    fallbacks: RowCreditFallback[],
  ): Promise<Map<string, OwnerCredit>> => {
    const out = new Map<string, OwnerCredit>();
    const ids = [...new Set(fallbacks.map((f) => f.ownerId))];
    if (ids.length === 0) return out;

    // Pre-fill from row fallbacks so even if Clerk fails entirely we
    // still return something for every owner.
    for (const f of fallbacks) {
      if (out.has(f.ownerId)) continue;
      out.set(f.ownerId, {
        userId: f.ownerId,
        name: f.creditName?.trim() || "anonymous",
        handle: fallbackHandle(f.ownerId),
        url: f.creditUrl,
        imageUrl: f.creditImage,
      });
    }

    let client: Awaited<ReturnType<typeof clerkClient>>;
    try {
      client = await clerkClient();
    } catch {
      return out;
    }

    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      try {
        const list = await client.users.getUserList({
          userId: batch,
          limit: 100,
        });
        for (const u of list.data) {
          const fallback = fallbacks.find((f) => f.ownerId === u.id);
          const primary = u.emailAddresses.find(
            (e) => e.id === u.primaryEmailAddressId,
          );
          const externalAccounts = (u.externalAccounts ?? []) as Array<{
            provider?: string;
            username?: string;
          }>;
          const externalUrl = externalUrlFor(externalAccounts);
          const name = buildName(
            u.username ?? null,
            u.firstName ?? null,
            u.lastName ?? null,
            primary?.emailAddress ?? null,
            fallback?.creditName ?? null,
          );
          out.set(u.id, {
            userId: u.id,
            name,
            handle: u.username
              ? u.username.toLowerCase()
              : fallbackHandle(u.id),
            url: externalUrl ?? fallback?.creditUrl ?? null,
            imageUrl: u.imageUrl ?? fallback?.creditImage ?? null,
          });
        }
      } catch {
        /* keep the row-fallback entry already in `out` */
      }
    }

    return out;
  },
);

export async function resolveOwnerCreditFor(
  row: RowCreditFallback,
): Promise<OwnerCredit> {
  const map = await resolveOwnerCredits([row]);
  return (
    map.get(row.ownerId) ?? {
      userId: row.ownerId,
      name: row.creditName?.trim() || "anonymous",
      handle: fallbackHandle(row.ownerId),
      url: row.creditUrl,
      imageUrl: row.creditImage,
    }
  );
}
