import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";

const MONTH_LABEL = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

export function getBatchKey(approvedAt: Date): string {
  return approvedAt.toISOString().slice(0, 7);
}

export function formatBatchLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return `Class of ${MONTH_LABEL.format(date)} ${year}`;
}

export async function getAvailableBatches(): Promise<
  Array<{ key: string; label: string; count: number }>
> {
  const result = await db.execute<{ key: string; count: number }>(sql`
    SELECT
      to_char(date_trunc('month', approved_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS key,
      count(*)::int AS count
    FROM submitted_pets
    WHERE status = 'approved' AND source != 'discover'
    GROUP BY 1
    ORDER BY 1 DESC
  `);

  return (result.rows ?? []).map((row) => ({
    key: row.key,
    label: formatBatchLabel(row.key),
    count: row.count,
  }));
}
