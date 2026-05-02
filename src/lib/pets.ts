import { pets as curated } from "@/data/pets.generated";
import { db, schema } from "@/lib/db/client";
import type { PetdexPet } from "@/lib/types";

import { and, eq } from "drizzle-orm";

export function getCuratedPets(): PetdexPet[] {
  return curated;
}

export function getCuratedPet(slug: string): PetdexPet | undefined {
  return curated.find((pet) => pet.slug === slug);
}

export async function getPets(): Promise<PetdexPet[]> {
  const approved = await fetchApprovedSubmissions();
  // Curated first, then community submissions sorted by displayName
  approved.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return [...curated, ...approved];
}

export async function getPet(slug: string): Promise<PetdexPet | undefined> {
  const curatedHit = getCuratedPet(slug);
  if (curatedHit) return curatedHit;

  const row = await db.query.submittedPets.findFirst({
    where: and(
      eq(schema.submittedPets.slug, slug),
      eq(schema.submittedPets.status, "approved"),
    ),
  });
  if (!row) return undefined;
  return submissionToPet(row);
}

export async function getPetStats() {
  const approved = await fetchApprovedSubmissions();
  return {
    total: curated.length + approved.length,
    approved:
      curated.filter((pet) => pet.approvalState === "approved").length +
      approved.length,
  };
}

async function fetchApprovedSubmissions(): Promise<PetdexPet[]> {
  const rows = await db
    .select()
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.status, "approved"));
  return rows.map(submissionToPet);
}

function submissionToPet(row: typeof schema.submittedPets.$inferSelect): PetdexPet {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    description: row.description,
    spritesheetPath: row.spritesheetUrl,
    petJsonPath: row.petJsonUrl,
    approvalState: "approved",
    kind: row.kind,
    vibes: (row.vibes as PetdexPet["vibes"]) ?? [],
    tags: (row.tags as string[]) ?? [],
    importedAt:
      row.approvedAt?.toISOString() ?? row.createdAt.toISOString(),
    qa: {},
  };
}
