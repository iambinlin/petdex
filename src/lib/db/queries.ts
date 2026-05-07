import { desc, eq } from "drizzle-orm";

import { db, schema } from "./client";
import type { SubmissionReview, SubmittedPet } from "./schema";

export type SubmittedPetWithReview = SubmittedPet & {
  latestReview: SubmissionReview | null;
};

export async function listSubmittedPetsByStatus(
  status: SubmittedPet["status"],
): Promise<SubmittedPet[]> {
  return db
    .select()
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.status, status))
    .orderBy(desc(schema.submittedPets.createdAt));
}

export async function listAllSubmittedPets(): Promise<SubmittedPet[]> {
  return db
    .select()
    .from(schema.submittedPets)
    .orderBy(desc(schema.submittedPets.createdAt));
}

export async function listAllSubmittedPetsWithLatestReview(): Promise<
  SubmittedPetWithReview[]
> {
  const [pets, reviews] = await Promise.all([
    listAllSubmittedPets(),
    db
      .select()
      .from(schema.submissionReviews)
      .orderBy(desc(schema.submissionReviews.createdAt)),
  ]);

  const latestByPet = new Map<string, SubmissionReview>();
  for (const review of reviews) {
    if (!latestByPet.has(review.submittedPetId)) {
      latestByPet.set(review.submittedPetId, review);
    }
  }

  return pets.map((pet) => ({
    ...pet,
    latestReview: latestByPet.get(pet.id) ?? null,
  }));
}

export async function getSubmittedPetById(
  id: string,
): Promise<SubmittedPet | null> {
  const row = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.id, id),
  });
  return row ?? null;
}
