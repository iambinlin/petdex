// Seed 10 themed collections with anime-heroes-style identity, then
// auto-populate them by matching pet vibes + tags. Each collection has
// a narrative hook (not a generic facet like "fluffy"), so they can
// headline a launch email + dedicated hero UI.
//
// Idempotent. Re-run safe — uses ON CONFLICT for collections and
// (collection_id, pet_slug) PK for items.
//
// Run:
//   bun --env-file .env.local scripts/seed-themed-collections.ts [--dry]
//   bun --env-file .env.local scripts/seed-themed-collections.ts --only=cyberpunk-strays

import { and, sql as dsql, eq, inArray } from "drizzle-orm";

import { db, schema } from "../src/lib/db/client";

const dryRun = process.argv.includes("--dry");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlySlug = onlyArg ? onlyArg.split("=")[1] : null;

type Theme = {
  slug: string;
  title: string;
  description: string;
  vibes?: string[];
  kinds?: ("creature" | "object" | "character")[];
  tagIncludes?: string[];
  colorFamilies?: string[];
  limit?: number;
};

const THEMES: Theme[] = [
  {
    slug: "cyberpunk-strays",
    title: "Cyberpunk Strays",
    description:
      "Neon-drenched companions from the fringes of the grid. Edgy, mischievous, off-the-record.",
    vibes: ["edgy", "mischievous", "chaotic"],
    tagIncludes: ["cyber", "neon", "robot", "android", "tech", "hacker"],
  },
  {
    slug: "ghibli-companions",
    title: "Ghibli Companions",
    description:
      "Soft, wholesome, slightly magical. The pets you'd meet on a forest detour at dusk.",
    vibes: ["wholesome", "cozy", "calm"],
    tagIncludes: ["forest", "spirit", "ghibli", "totoro", "cat", "owl"],
  },
  {
    slug: "anime-heroes",
    title: "Anime Heroes",
    description:
      "The shounen lineup. Fierce silhouettes, signature moves, no flinching.",
    vibes: ["heroic"],
    kinds: ["character"],
    tagIncludes: ["anime", "hero", "shounen", "warrior"],
  },
  {
    slug: "mystic-familiars",
    title: "Mystic Familiars",
    description:
      "Bonded to old magic. They watch from candlelight and remember everything.",
    vibes: ["mystical", "melancholic"],
    tagIncludes: ["magic", "spell", "witch", "rune", "occult", "moon"],
  },
  {
    slug: "tiny-chaos-agents",
    title: "Tiny Chaos Agents",
    description:
      "Small. Unhinged. They knocked the cup off the table on purpose and they'll do it again.",
    vibes: ["chaotic", "mischievous", "playful"],
  },
  {
    slug: "studio-deskmates",
    title: "Studio Deskmates",
    description:
      "Focused, calm, perfectly content with a long compile. The pets that quietly pair-program.",
    vibes: ["focused", "calm", "cozy"],
    tagIncludes: ["coffee", "code", "desk", "study", "book"],
  },
  {
    slug: "retro-game-cast",
    title: "Retro Game Cast",
    description:
      "Sprite-era mascots. Every frame counts. Save points still hit.",
    kinds: ["character"],
    tagIncludes: ["pixel", "8bit", "16bit", "retro", "arcade", "game"],
  },
  {
    slug: "object-spirits",
    title: "Object Spirits",
    description:
      "Things that aren't supposed to be alive but absolutely are. Toasters with feelings.",
    kinds: ["object"],
  },
  {
    slug: "midnight-melancholy",
    title: "Midnight Melancholy",
    description: "Up too late. Window pets. Quiet songs about empty cities.",
    vibes: ["melancholic", "calm"],
  },
  {
    slug: "good-vibes-only",
    title: "Good Vibes Only",
    description:
      "The cheerful welcome committee. Optimism with fur. Bring snacks.",
    vibes: ["cheerful", "playful", "wholesome"],
  },
];

async function findMatchingPets(theme: Theme): Promise<string[]> {
  const conditions = [eq(schema.submittedPets.status, "approved")];

  if (theme.kinds && theme.kinds.length > 0) {
    conditions.push(inArray(schema.submittedPets.kind, theme.kinds));
  }

  if (theme.vibes && theme.vibes.length > 0) {
    const vibeArray = `ARRAY[${theme.vibes.map((v) => `'${v}'`).join(",")}]::text[]`;
    conditions.push(
      dsql`(${schema.submittedPets.vibes})::jsonb ?| ${dsql.raw(vibeArray)}`,
    );
  }

  if (theme.colorFamilies && theme.colorFamilies.length > 0) {
    conditions.push(
      inArray(schema.submittedPets.colorFamily, theme.colorFamilies),
    );
  }

  let rows = await db
    .select({
      slug: schema.submittedPets.slug,
      tags: schema.submittedPets.tags,
    })
    .from(schema.submittedPets)
    .where(and(...conditions))
    .limit(theme.limit ?? 200);

  if (theme.tagIncludes && theme.tagIncludes.length > 0) {
    const needles = theme.tagIncludes.map((t) => t.toLowerCase());
    rows = rows.filter((r) => {
      const tags = (r.tags ?? []).map((t) => t.toLowerCase());
      return needles.some((n) => tags.some((t) => t.includes(n)));
    });
  }

  return rows.map((r) => r.slug);
}

async function upsertCollection(theme: Theme): Promise<string> {
  const existing = await db
    .select()
    .from(schema.petCollections)
    .where(eq(schema.petCollections.slug, theme.slug))
    .limit(1);

  if (existing[0]) {
    if (!dryRun) {
      await db
        .update(schema.petCollections)
        .set({
          title: theme.title,
          description: theme.description,
          featured: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.petCollections.slug, theme.slug));
    }
    return existing[0].id;
  }

  const id = `col_${crypto.randomUUID().replace(/-/g, "").slice(0, 22)}`;
  if (!dryRun) {
    await db.insert(schema.petCollections).values({
      id,
      slug: theme.slug,
      title: theme.title,
      description: theme.description,
      featured: true,
    });
  }
  return id;
}

async function main() {
  const themes = onlySlug ? THEMES.filter((t) => t.slug === onlySlug) : THEMES;
  if (onlySlug && themes.length === 0) {
    console.error(`no theme matches --only=${onlySlug}`);
    process.exit(1);
  }

  for (const theme of themes) {
    const slugs = await findMatchingPets(theme);
    console.log(
      `${theme.slug}: ${slugs.length} matches${dryRun ? " (dry)" : ""}`,
    );
    if (slugs.length === 0) continue;

    const collectionId = await upsertCollection(theme);
    if (dryRun) {
      console.log(
        `  would-add → ${slugs.slice(0, 5).join(", ")}${slugs.length > 5 ? "…" : ""}`,
      );
      continue;
    }

    let position = 0;
    for (const petSlug of slugs) {
      try {
        await db
          .insert(schema.petCollectionItems)
          .values({ collectionId, petSlug, position: position++ })
          .onConflictDoNothing();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  skip ${petSlug}: ${msg}`);
      }
    }

    if (slugs[0]) {
      await db
        .update(schema.petCollections)
        .set({ coverPetSlug: slugs[0], updatedAt: new Date() })
        .where(eq(schema.petCollections.id, collectionId));
    }
  }

  console.log("\ndone");
}

await main();
