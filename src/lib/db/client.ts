// Server-only Drizzle client. Importing this from a client component
// will throw a build-time error (via the `server-only` package) which
// is far easier to debug than a runtime "DATABASE_URL is not set" in
// the browser console.
import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { IS_MOCK } from "../mock";
import { getMockDb, mockDbReady } from "../mock/db";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function buildClient(): DrizzleDb {
  if (IS_MOCK) {
    return getMockDb().db as unknown as DrizzleDb;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

// Block on PGlite bootstrap+seed at module load time so any page
// running queries on first render finds the schema in place. In
// production this is a no-op.
if (IS_MOCK) {
  await mockDbReady();
}

export const db = buildClient();
export { schema };
