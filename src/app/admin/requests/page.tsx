import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { isAdmin } from "@/lib/admin";
import { db, schema } from "@/lib/db/client";

export const metadata = {
  title: "Petdex — Admin · Requests",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const rows = await db
    .select({
      id: schema.petRequests.id,
      query: schema.petRequests.query,
      upvoteCount: schema.petRequests.upvoteCount,
      status: schema.petRequests.status,
      fulfilledPetSlug: schema.petRequests.fulfilledPetSlug,
      requestedBy: schema.petRequests.requestedBy,
      createdAt: schema.petRequests.createdAt,
    })
    .from(schema.petRequests)
    .orderBy(
      sql`${schema.petRequests.upvoteCount} DESC, ${schema.petRequests.createdAt} DESC`,
    )
    .limit(200);

  const open = rows.filter((r) => r.status === "open");
  const fulfilled = rows.filter((r) => r.status === "fulfilled");
  const dismissed = rows.filter((r) => r.status === "dismissed");

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-black backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            Back to review queue
          </Link>
          <span className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase">
            Admin · {rows.length} requests
          </span>
        </div>

        <header>
          <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
            Community wishlist
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
            Pet requests
          </h1>
          <p className="mt-3 text-sm text-stone-600">
            {open.length} open · {fulfilled.length} fulfilled ·{" "}
            {dismissed.length} dismissed
          </p>
        </header>

        {open.length > 0 ? (
          <Section title="Open" count={open.length}>
            {open.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </Section>
        ) : (
          <Empty>No open requests right now.</Empty>
        )}

        {fulfilled.length > 0 ? (
          <Section title="Fulfilled" count={fulfilled.length}>
            {fulfilled.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </Section>
        ) : null}

        {dismissed.length > 0 ? (
          <Section title="Dismissed" count={dismissed.length}>
            {dismissed.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </Section>
        ) : null}
      </section>
    </main>
  );
}

function RequestRow({
  request,
}: {
  request: {
    id: string;
    query: string;
    upvoteCount: number;
    status: string;
    fulfilledPetSlug: string | null;
    requestedBy: string | null;
    createdAt: Date;
  };
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/76 px-4 py-3 backdrop-blur">
      <div className="flex shrink-0 flex-col items-center rounded-xl border border-black/10 bg-white px-3 py-1.5 text-stone-700">
        <span className="font-mono text-sm font-semibold leading-none">
          {request.upvoteCount}
        </span>
        <span className="font-mono text-[9px] tracking-[0.18em] text-stone-400 uppercase">
          votes
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-900">{request.query}</p>
        <p className="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase">
          {request.status === "fulfilled" && request.fulfilledPetSlug ? (
            <span className="text-emerald-700">
              Fulfilled · /pets/{request.fulfilledPetSlug}
            </span>
          ) : null}
          {request.status === "dismissed" ? (
            <span className="text-rose-700">Dismissed</span>
          ) : null}
          {request.status === "open" ? (
            <>open · {new Date(request.createdAt).toLocaleDateString()}</>
          ) : null}
          {request.requestedBy ? (
            <span className="ml-2 normal-case text-stone-400">
              by {request.requestedBy.slice(0, 14)}…
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="font-mono text-[10px] tracking-[0.22em] text-stone-500 uppercase">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-6 text-center text-sm text-stone-600">
      {children}
    </div>
  );
}
