import Link from "next/link";

import { desc, isNotNull } from "drizzle-orm";

import { AdminEditActions } from "@/components/admin-edit-actions";
import { db, schema } from "@/lib/db/client";

export const metadata = {
  title: "Petdex — Admin · Edits",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function DiffField({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-stone-900/80">
      <p className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase dark:text-stone-400">
        {label}
      </p>
      <div className="mt-1 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl bg-rose-50/60 p-2 text-sm leading-6 text-rose-900 line-through ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          {before || <span className="italic opacity-60">empty</span>}
        </div>
        <div className="rounded-xl bg-emerald-50/60 p-2 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
          {after || <span className="italic opacity-60">empty</span>}
        </div>
      </div>
    </div>
  );
}

function TagDiff({
  before,
  after,
}: {
  before: string[];
  after: string[];
}) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const removed = before.filter((t) => !afterSet.has(t));
  const added = after.filter((t) => !beforeSet.has(t));
  const kept = before.filter((t) => afterSet.has(t));

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-stone-900/80">
      <p className="font-mono text-[10px] tracking-[0.12em] text-stone-500 uppercase dark:text-stone-400">
        Tags
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {kept.map((t) => (
          <span
            key={`kept-${t}`}
            className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
          >
            {t}
          </span>
        ))}
        {removed.map((t) => (
          <span
            key={`rm-${t}`}
            className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-900 line-through ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {t}
          </span>
        ))}
        {added.map((t) => (
          <span
            key={`add-${t}`}
            className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            +{t}
          </span>
        ))}
        {kept.length + removed.length + added.length === 0 ? (
          <span className="text-xs italic text-stone-400 dark:text-stone-500">No changes</span>
        ) : null}
      </div>
    </div>
  );
}

export default async function AdminEditsPage() {
  const rows = await db
    .select()
    .from(schema.submittedPets)
    .where(isNotNull(schema.submittedPets.pendingSubmittedAt))
    .orderBy(desc(schema.submittedPets.pendingSubmittedAt));

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 pb-12 md:px-8 md:pb-16">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
          Edit queue
        </p>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          Pending edits
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Owner-submitted text changes awaiting re-approval. The live page
          keeps showing the approved values until you act.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm text-stone-600 dark:border-white/15 dark:bg-stone-900/60 dark:text-stone-400">
          No pending edits.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const currentTags = (r.tags as string[]) ?? [];
            const pendingTags = (r.pendingTags as string[] | null) ?? null;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-stone-900/60"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/pets/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-medium text-stone-900 hover:underline dark:text-stone-100"
                  >
                    {r.displayName}
                  </Link>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase dark:text-stone-500">
                    /{r.slug}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-stone-400 uppercase dark:text-stone-500">
                    · submitted{" "}
                    {r.pendingSubmittedAt
                      ? new Date(r.pendingSubmittedAt).toLocaleString()
                      : "?"}
                  </span>
                  <div className="ml-auto">
                    <AdminEditActions id={r.id} />
                  </div>
                </div>

                <div className="space-y-3">
                  {r.pendingDisplayName ? (
                    <DiffField
                      label="Display name"
                      before={r.displayName}
                      after={r.pendingDisplayName}
                    />
                  ) : null}
                  {r.pendingDescription ? (
                    <DiffField
                      label="Description"
                      before={r.description}
                      after={r.pendingDescription}
                    />
                  ) : null}
                  {pendingTags ? (
                    <TagDiff before={currentTags} after={pendingTags} />
                  ) : null}
                  {!r.pendingDisplayName &&
                  !r.pendingDescription &&
                  !pendingTags ? (
                    <p className="text-sm italic text-stone-400 dark:text-stone-500">
                      Edit submitted but no changes detected. Reject to clear.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
