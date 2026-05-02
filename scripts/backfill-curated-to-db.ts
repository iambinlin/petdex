// Backfill curated pets (src/data/pets.generated.ts + public/pets/<slug>/)
// into the DB. Uploads spritesheet, pet.json, and a generated zip to R2 so
// nothing depends on the local /public/pets folder anymore.
//
// Idempotent: if a slug already has DB rows, the script skips R2 uploads
// and only patches missing columns (featured, kind, vibes, tags). Re-run
// safely.
//
// Usage:
//   bun scripts/backfill-curated-to-db.ts
//   bun scripts/backfill-curated-to-db.ts --dry
//   bun scripts/backfill-curated-to-db.ts --force-upload   # always re-upload

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import JSZip from "jszip";

import { pets as curated } from "@/data/pets.generated";
import * as schema from "@/lib/db/schema";

const ADMIN_OWNER_ID = "user_3DA3wOYrJh1UNufe2pgQpcF6GJ7";
const ADMIN_OWNER_EMAIL = "railly@clerk.dev";
const PROJECT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const FORCE = args.has("--force-upload");

function env(name: string, optional = false): string {
  const v = process.env[name];
  if (!v && !optional) throw new Error(`missing env ${name}`);
  return v ?? "";
}

const DATABASE_URL = env("DATABASE_URL");
const R2_ACCOUNT_ID = env("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = env("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = env("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = process.env.R2_BUCKET ?? "petdex-pets";
const R2_PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE ??
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev";

const sqlite = neon(DATABASE_URL);
const db = drizzle(sqlite, { schema });

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  if (DRY) {
    console.log(`  DRY r2 PUT ${key} (${contentType}, ${body.byteLength}b)`);
    return `${R2_PUBLIC_BASE}/${key}`;
  }
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${R2_PUBLIC_BASE}/${key}`;
}

async function buildZipFromCurated(slug: string): Promise<Buffer> {
  const folder = resolve(PROJECT_ROOT, "public", "pets", slug);
  const spritesheet = await readFile(resolve(folder, "spritesheet.webp"));
  const petJson = await readFile(resolve(folder, "pet.json"));

  const zip = new JSZip();
  zip.file("pet.json", petJson);
  zip.file("spritesheet.webp", spritesheet);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function processOne(pet: (typeof curated)[number]): Promise<void> {
  console.log(`\n[${pet.slug}] ${pet.displayName}`);

  const existing = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.slug, pet.slug),
  });

  if (existing && !FORCE) {
    console.log(`  exists (id=${existing.id}); patching metadata only`);
    if (DRY) {
      console.log(`  DRY would update featured/kind/vibes/tags`);
      return;
    }
    await db
      .update(schema.submittedPets)
      .set({
        featured: pet.featured ?? false,
        kind: pet.kind,
        vibes: pet.vibes,
        tags: pet.tags,
        displayName: pet.displayName,
        description: pet.description,
        status: "approved",
        approvedAt: existing.approvedAt ?? new Date(),
        rejectedAt: null,
        rejectionReason: null,
      })
      .where(eq(schema.submittedPets.id, existing.id));
    console.log(`  patched ✓`);
    return;
  }

  // Read source files
  const folder = resolve(PROJECT_ROOT, "public", "pets", pet.slug);
  const spritesheet = await readFile(resolve(folder, "spritesheet.webp"));
  const petJsonRaw = await readFile(resolve(folder, "pet.json"));
  const zipBuf = await buildZipFromCurated(pet.slug);

  // Upload to R2 under a stable curated/ prefix
  const prefix = `curated/${pet.slug}`;
  const [spritesheetUrl, petJsonUrl, zipUrl] = await Promise.all([
    uploadToR2(`${prefix}/spritesheet.webp`, spritesheet, "image/webp"),
    uploadToR2(`${prefix}/pet.json`, petJsonRaw, "application/json"),
    uploadToR2(`${prefix}/${pet.slug}.zip`, zipBuf, "application/zip"),
  ]);

  if (DRY) {
    console.log(`  DRY would insert row`);
    return;
  }

  if (existing && FORCE) {
    await db
      .update(schema.submittedPets)
      .set({
        spritesheetUrl,
        petJsonUrl,
        zipUrl,
        featured: pet.featured ?? false,
        kind: pet.kind,
        vibes: pet.vibes,
        tags: pet.tags,
        displayName: pet.displayName,
        description: pet.description,
      })
      .where(eq(schema.submittedPets.id, existing.id));
    console.log(`  re-uploaded + updated ✓`);
    return;
  }

  await db.insert(schema.submittedPets).values({
    id: pet.slug, // stable id matching curated slug
    slug: pet.slug,
    displayName: pet.displayName,
    description: pet.description,
    spritesheetUrl,
    petJsonUrl,
    zipUrl,
    kind: pet.kind,
    vibes: pet.vibes,
    tags: pet.tags,
    featured: pet.featured ?? false,
    status: "approved",
    ownerId: ADMIN_OWNER_ID,
    ownerEmail: ADMIN_OWNER_EMAIL,
    creditName: pet.submittedBy?.name ?? null,
    creditUrl: pet.submittedBy?.url ?? null,
    creditImage: pet.submittedBy?.imageUrl ?? null,
    approvedAt: new Date(pet.importedAt ?? Date.now()),
  });
  console.log(`  inserted ✓`);
}

async function main(): Promise<void> {
  console.log(
    `backfill-curated-to-db  (${curated.length} curated, dry=${DRY}, force=${FORCE})`,
  );

  for (const pet of curated) {
    try {
      await processOne(pet);
    } catch (err) {
      console.error(`  ✗ ${pet.slug}:`, (err as Error).message);
    }
  }

  console.log("\ndone");
  process.exit(0);
}

void main();
