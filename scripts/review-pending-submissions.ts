import { and, desc, eq, lt } from "drizzle-orm";

import { runtimeDb as db, schema } from "../src/lib/db/runtime";

process.env.PETDEX_REVIEW_DB = "runtime";

const LIMIT = readNumberFlag("--limit");
const FORCE = process.argv.includes("--force");
const CONCURRENCY = Math.min(
  Math.max(readNumberFlag("--concurrency") ?? 2, 1),
  4,
);
const STALE_RUNNING_MINUTES = 60;

type ReviewError = { slug: string; reason: string };

const errors: ReviewError[] = [];

async function main() {
  const { reviewSubmission } = await import("../src/lib/submission-review");
  await buryStaleRunningReviews();

  const rows = await db
    .select({ id: schema.submittedPets.id, slug: schema.submittedPets.slug })
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.status, "pending"))
    .orderBy(desc(schema.submittedPets.createdAt))
    .limit(LIMIT ?? 500);

  console.log(
    `reviewing ${rows.length} pending submissions with concurrency=${CONCURRENCY} force=${FORCE}`,
  );

  let nextIndex = 0;
  let processed = 0;

  async function worker(workerId: number) {
    while (true) {
      const index = nextIndex++;
      if (index >= rows.length) return;
      const row = rows[index];
      try {
        const result = await reviewSubmission(row.id, {
          force: FORCE,
        });
        processed += 1;
        console.log(
          `[${index + 1}/${rows.length}] worker=${workerId} ${row.slug} -> ${result.review.decision} (${result.review.reasonCode ?? "no_reason"}) applied=${result.applied} reused=${Boolean(result.reused)}`,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        errors.push({ slug: row.slug, reason });
        console.log(
          `[${index + 1}/${rows.length}] ${row.slug} -> ERROR ${reason}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, rows.length || 1) },
      (_, index) => worker(index + 1),
    ),
  );

  console.log(`done processed=${processed} errors=${errors.length}`);
  if (errors.length > 0) {
    console.log("errors:");
    for (const error of errors) {
      console.log(`- ${error.slug}: ${error.reason}`);
    }
  }
}

async function buryStaleRunningReviews() {
  const cutoff = new Date(Date.now() - STALE_RUNNING_MINUTES * 60 * 1000);
  const now = new Date();
  const rows = await db
    .update(schema.submissionReviews)
    .set({
      status: "failed",
      decision: "hold",
      reasonCode: "review_interrupted",
      summary: "Automated review was interrupted and needs manual review.",
      confidence: 0,
      error: "Review worker stopped before completion.",
      reviewedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        lt(schema.submissionReviews.createdAt, cutoff),
        eq(schema.submissionReviews.status, "running"),
      ),
    )
    .returning({ id: schema.submissionReviews.id });
  if (rows.length > 0) {
    console.log(`buried ${rows.length} stale running review(s)`);
  }
}

function readNumberFlag(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const raw = process.argv[index + 1];
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

await main();
