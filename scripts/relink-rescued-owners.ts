// Relink rescued pets to their real Clerk users.
//
// When the rescue script saves a recovered submission, it credits the
// GitHub username via credit_name + credit_url, but leaves owner_id /
// owner_email pointing at the admin (so the admin sees them in /admin).
// That means the real author can't see the pet on /my-pets — it shows up
// as belonging to railly@clerk.dev.
//
// This script walks every pet currently owned by the admin where
// credit_url is a github.com profile, looks up the Clerk user whose
// verified GitHub external account matches, and reassigns owner_id +
// owner_email. Pets without a matching Clerk user stay on admin (they
// can still claim later via /my-pets > banner).

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/lib/db/schema";

// Hit Clerk Backend API directly. Avoids pulling next runtime deps
// into a CLI script.
const CLERK_BASE = "https://api.clerk.com/v1";
const CLERK_KEY = process.env.CLERK_SECRET_KEY ?? "";
async function clerkFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CLERK_BASE}${path}`, {
    headers: { Authorization: `Bearer ${CLERK_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`clerk ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

const ADMIN_OWNER_ID = "user_3DA3wOYrJh1UNufe2pgQpcF6GJ7";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const sql = neon(env("DATABASE_URL"));
const db = drizzle(sql, { schema });
env("CLERK_SECRET_KEY"); // assert presence

type ClerkUser = {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status?: string } | null;
  }>;
  external_accounts: Array<{
    provider: string;
    username: string | null;
    verification: { status?: string } | null;
  }>;
};

async function findClerkUserByGitHub(login: string): Promise<{
  userId: string;
  email: string | null;
} | null> {
  const target = login.toLowerCase();
  let offset = 0;
  const limit = 100;
  while (true) {
    const list = await clerkFetch<ClerkUser[]>(
      `/users?limit=${limit}&offset=${offset}`,
    );
    for (const user of list) {
      for (const acc of user.external_accounts ?? []) {
        if (acc.provider !== "oauth_github") continue;
        const username = acc.username?.toLowerCase()?.trim();
        if (username !== target) continue;
        const primary =
          user.email_addresses.find(
            (e) => e.id === user.primary_email_address_id,
          ) ?? user.email_addresses[0];
        const email =
          primary && primary.verification?.status === "verified"
            ? primary.email_address.toLowerCase()
            : null;
        return { userId: user.id, email };
      }
    }
    if (list.length < limit) break;
    offset += limit;
    if (offset > 5000) break;
  }
  return null;
}

async function main() {
  // Pets owned by admin with a github credit URL.
  const rows = (await sql`
    SELECT id, slug, status, credit_name, credit_url, owner_email
    FROM submitted_pets
    WHERE owner_id = ${ADMIN_OWNER_ID}
      AND credit_url LIKE 'https://github.com/%'
    ORDER BY created_at DESC
  `) as Array<{
    id: string;
    slug: string;
    status: string;
    credit_name: string | null;
    credit_url: string;
    owner_email: string | null;
  }>;

  console.log(`scanning ${rows.length} admin-owned, github-credited pets`);

  // Cache GitHub login -> clerk lookup so we don't re-walk Clerk pages
  // for the same author across multiple pets.
  const cache = new Map<string, { userId: string; email: string | null } | null>();

  let relinked = 0;
  let unmatched = 0;

  for (const row of rows) {
    const ghLogin = row.credit_url.replace("https://github.com/", "").replace(/\/.*$/, "").trim();
    if (!ghLogin) continue;

    let match = cache.get(ghLogin);
    if (match === undefined) {
      process.stdout.write(`  lookup ${ghLogin} ... `);
      try {
        match = await findClerkUserByGitHub(ghLogin);
      } catch (err) {
        console.log(`ERR (${(err as Error).message.slice(0, 60)})`);
        match = null;
      }
      cache.set(ghLogin, match);
      console.log(match ? `→ ${match.userId} (${match.email ?? "no email"})` : "no clerk user");
    }

    if (!match) {
      unmatched++;
      continue;
    }

    await db
      .update(schema.submittedPets)
      .set({
        ownerId: match.userId,
        ownerEmail: match.email ?? row.owner_email,
      })
      .where(eq(schema.submittedPets.id, row.id));
    relinked++;
    console.log(`    relinked: ${row.slug} (${row.status}) → ${ghLogin}`);
  }

  console.log(`\nrelinked: ${relinked}`);
  console.log(`unmatched: ${unmatched} (no Clerk account with that github yet — they can still claim via /my-pets after sign-in)`);
}

await main();
