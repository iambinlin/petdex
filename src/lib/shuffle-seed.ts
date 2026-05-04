// Per-visitor stable shuffle seed used by the curated gallery sort.
//
// Why: the default `curated` sort was deterministic for every visitor
// ("featured DESC, displayName ASC"), so pets near the front of the
// alphabet always won the homepage real-estate lottery. We seed a
// stable, per-visitor random hash so each person sees a unique
// ordering of the catalog, while keeping the order rock-stable
// across refresh + infinite scroll within a 30-day window.
//
// Issue: https://github.com/crafter-station/petdex/issues/82

import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "petdex_shuffle_seed";
const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

// 16-char hex (8 random bytes). Tight regex on read so a tampered
// cookie can't smuggle SQL fragments into ORDER BY md5(slug || $seed).
const SEED_PATTERN = /^[a-f0-9]{16}$/;

/**
 * Reads the shuffle seed cookie if present and well-formed; otherwise
 * mints a new one, sets it on the response, and returns it.
 *
 * Safe to call from RSC and API routes. Returns a deterministic-per-
 * visitor seed for the next 30 days.
 */
export async function getOrSetShuffleSeed(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing && SEED_PATTERN.test(existing)) return existing;

  const seed = randomBytes(8).toString("hex");
  // SameSite=Lax so it travels with normal navigation. Not httpOnly
  // because we may want client-side reads later (e.g. a "shuffle
  // again" button); the seed isn't a credential, leaking it does
  // nothing beyond letting someone reproduce one visitor's order.
  jar.set(COOKIE_NAME, seed, {
    maxAge: ONE_MONTH_SECONDS,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return seed;
}

/**
 * Read-only variant for contexts where setting a cookie would be a
 * mistake (e.g. read-side helpers that don't own the response).
 * Returns null when no cookie is present so the caller can decide
 * how to fall back.
 */
export async function readShuffleSeed(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  return existing && SEED_PATTERN.test(existing) ? existing : null;
}
