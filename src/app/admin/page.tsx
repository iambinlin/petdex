import { listAllSubmittedPets } from "@/lib/db/queries";
import { petStates } from "@/lib/pet-states";

import { AdminReviewRow } from "@/components/admin-review-row";
import { AdminStatusFilter } from "@/components/admin-status-filter";

export const metadata = {
  title: "Petdex — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SP = { status?: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const { status } = await searchParams;
  const filter = ((status ?? "pending") as
    | "all"
    | "pending"
    | "approved"
    | "rejected") satisfies "all" | "pending" | "approved" | "rejected";

  const pets = await listAllSubmittedPets();
  const counts = {
    all: pets.length,
    pending: pets.filter((p) => p.status === "pending").length,
    approved: pets.filter((p) => p.status === "approved").length,
    rejected: pets.filter((p) => p.status === "rejected").length,
  };

  const visible =
    filter === "all" ? pets : pets.filter((p) => p.status === filter);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-12 md:px-8 md:pb-16">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
          Submission queue
        </p>
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          Review pets
        </h1>
        <AdminStatusFilter counts={counts} />
      </header>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 p-10 text-center text-sm text-stone-600">
          No pets in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((pet) => (
            <AdminReviewRow
              key={pet.id}
              pet={pet}
              stateCount={petStates.length}
            />
          ))}
        </div>
      )}
    </section>
  );
}
