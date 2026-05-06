// Seed the local dev database with ~20 approved pets so the gallery,
// /u/<handle>, and pet detail pages have something to render after a
// fresh `bun run dev:docker`. Idempotent — re-running upserts the same
// rows by slug.
//
// Why we point at production R2 sprite URLs: contributors don't have
// R2 credentials. The sprites we reference are public OSS pets in the
// real bucket (CORS open). The image element happily fetches them and
// the gallery looks like the real thing without anyone copying assets.
//
// If you're offline or want zero external requests, run dev:mock
// instead — it ships its own PGlite seed.

import { readFileSync } from "node:fs";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

type Idea = {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  status?: string;
};

const SPRITE_POOL = [
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/sabo-80c45eea390b/sprite.webp",
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/ghostface-67cb9e80b049/sprite.webp",
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/peri-the-owl-f84579a04c4c/sprite.webp",
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/curated/cash-cuy/spritesheet.webp",
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/xiaobai-6f1e63e04853/sprite.webp",
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/emma-745775f158a3/sprite.webp",
];

const PETJSON_POOL = [
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/sabo-80c45eea390b/petjson.json",
];

const ZIP_POOL = [
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev/pets/sabo-80c45eea390b/zip.zip",
];

// Cycle a small kind/vibe palette so the gallery filters render
// counts > 0 without having to call the auto-tag classifier.
const KIND_POOL = ["creature", "object", "character"] as const;
const VIBE_POOL = ["cozy", "playful", "focused", "mystical"];

const SEED_OWNER_ID = "user_seed_dev";
const SEED_OWNER_EMAIL = "seed@petdex.local";

async function main() {
  const ideasPath = new URL("../pets/ideas.json", import.meta.url);
  const raw = readFileSync(ideasPath, "utf8");
  const ideas = JSON.parse(raw) as Idea[];
  const sliceCount = Math.min(20, ideas.length);
  const slice = ideas.slice(0, sliceCount);

  let inserted = 0;
  let skipped = 0;
  const now = new Date();

  for (let i = 0; i < slice.length; i++) {
    const idea = slice[i];
    const slug = idea.id.toLowerCase();

    const existing = await db.query.submittedPets.findFirst({
      where: eq(schema.submittedPets.slug, slug),
    });
    if (existing) {
      skipped++;
      continue;
    }

    const id = `pet_seed_${slug.replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
    const sprite = SPRITE_POOL[i % SPRITE_POOL.length];
    const petJson = PETJSON_POOL[i % PETJSON_POOL.length];
    const zip = ZIP_POOL[i % ZIP_POOL.length];

    await db.insert(schema.submittedPets).values({
      id,
      slug,
      displayName: idea.name,
      description: idea.description,
      spritesheetUrl: sprite,
      petJsonUrl: petJson,
      zipUrl: zip,
      kind: KIND_POOL[i % KIND_POOL.length],
      vibes: [VIBE_POOL[i % VIBE_POOL.length]],
      tags: idea.tags ?? [],
      status: "approved",
      source: "discover",
      ownerId: SEED_OWNER_ID,
      ownerEmail: SEED_OWNER_EMAIL,
      creditName: "Petdex seed",
      creditUrl: "https://github.com/crafter-station/petdex",
      creditImage: null,
      approvedAt: now,
      // Stagger createdAt so 'recent' sort has interesting ordering.
      createdAt: new Date(now.getTime() - i * 60_000),
    });
    inserted++;
  }

  // A user_profile row for the seed owner so /u/petdex-seed renders.
  const handle = "petdex-seed";
  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, SEED_OWNER_ID),
  });
  if (!profile) {
    await db.insert(schema.userProfiles).values({
      userId: SEED_OWNER_ID,
      handle,
      displayName: "Petdex Seed",
      bio: "Demo pets seeded for local dev. Sign in with your own account to submit a real one.",
      preferredLocale: "en",
      featuredPetSlugs: slice.slice(0, 3).map((idea) => idea.id.toLowerCase()),
    });
  }

  console.log(
    `[seed-dev] inserted=${inserted} skipped=${skipped} (${slice.length} ideas total)`,
  );
  console.log(`[seed-dev] gallery seeded under /u/${handle}`);
}

main()
  .then(() => {
    // postgres-js keeps the pool open which holds the event loop. Force
    // exit so `bun run dev:docker` can move on to next dev.
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
