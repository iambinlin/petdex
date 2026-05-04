import Link from "next/link";

import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

import { RequestsView } from "@/components/requests-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pet requests",
  description:
    "Vote on pets the community wants to see in Petdex. Most-upvoted requests get prioritized.",
  alternates: { canonical: "/requests" },
};

export default async function RequestsPage() {
  const rows = await db
    .select({
      id: schema.petRequests.id,
      query: schema.petRequests.query,
      upvoteCount: schema.petRequests.upvoteCount,
      status: schema.petRequests.status,
      fulfilledPetSlug: schema.petRequests.fulfilledPetSlug,
      createdAt: schema.petRequests.createdAt,
    })
    .from(schema.petRequests)
    .where(eq(schema.petRequests.status, "open"))
    .orderBy(
      sql`${schema.petRequests.upvoteCount} DESC, ${schema.petRequests.createdAt} DESC`,
    )
    .limit(80);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-5 md:px-8 md:py-5">
        <SiteHeader />
      </section>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pb-20 md:px-8">
        <header className="space-y-3">
          <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
            Community wishlist
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            Pets people are asking for
          </h1>
          <p className="max-w-2xl text-base leading-7 text-stone-600">
            When someone searches for a pet that doesn't exist yet, they can
            request it. Upvote the ones you'd want too — most-upvoted go to the
            top of the curation list.
          </p>
          <Link
            href="/#gallery"
            className="inline-flex h-9 items-center rounded-full border border-black/10 bg-white px-4 text-xs font-medium text-stone-700 transition hover:border-black/30"
          >
            ← Back to gallery
          </Link>
        </header>

        <RequestsView initial={rows.map((r) => ({ ...r, voted: false }))} />
      </section>
      <SiteFooter />
    </main>
  );
}
