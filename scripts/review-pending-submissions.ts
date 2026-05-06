import { desc, eq } from "drizzle-orm";

import { runtimeDb as db, schema } from "../src/lib/db/runtime";

process.env.PETDEX_REVIEW_DB = "runtime";

const LIMIT = readNumberFlag("--limit");
const CONCURRENCY = Math.min(
  Math.max(readNumberFlag("--concurrency") ?? 2, 1),
  4,
);

type ReviewError = { slug: string; reason: string };

const errors: ReviewError[] = [];

async function main() {
  const { reviewSubmission } = await import("../src/lib/submission-review");
  const rows = await db
    .select({ id: schema.submittedPets.id, slug: schema.submittedPets.slug })
    .from(schema.submittedPets)
    .where(eq(schema.submittedPets.status, "pending"))
    .orderBy(desc(schema.submittedPets.createdAt))
    .limit(LIMIT ?? 500);

  console.log(
    `reviewing ${rows.length} pending submissions with concurrency=${CONCURRENCY}`,
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
          force: true,
        });
        processed += 1;
        console.log(
          `[${index + 1}/${rows.length}] worker=${workerId} ${row.slug} -> ${result.review.decision} (${result.review.reasonCode ?? "no_reason"}) applied=${result.applied}`,
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

function readNumberFlag(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const raw = process.argv[index + 1];
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

await main();
