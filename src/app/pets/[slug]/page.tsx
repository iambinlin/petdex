import { notFound } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { FileJson, Sparkles } from "lucide-react";

import { db, schema } from "@/lib/db/client";
import { getMetricsForSlug } from "@/lib/db/metrics";
import { getPet, getStaticPetSlugs } from "@/lib/pets";

import { DownloadActions } from "@/components/download-actions";
import { InstallCommand } from "@/components/install-command";
import { LikeButton } from "@/components/like-button";
import { PetStateViewer } from "@/components/pet-state-viewer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubmittedBy } from "@/components/submitted-by";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getStaticPetSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const pet = await getPet(slug);

  if (!pet) {
    return {
      title: "Pet not found - Petdex",
    };
  }

  return {
    title: `${pet.displayName} - Petdex`,
    description: pet.description,
  };
}

export default async function PetPage({ params }: PageProps) {
  const { slug } = await params;
  const pet = await getPet(slug);

  if (!pet) {
    notFound();
  }

  const { userId } = await auth();
  const metrics = await getMetricsForSlug(slug);
  const initialLiked = userId
    ? Boolean(
        await db.query.petLikes.findFirst({
          where: and(
            eq(schema.petLikes.userId, userId),
            eq(schema.petLikes.petSlug, slug),
          ),
        }),
      )
    : false;

  return (
    <main className="min-h-screen bg-[#f7f8ff]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-5 md:px-8 md:py-5">
        <SiteHeader />
      </section>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-12 md:px-8 md:pb-16">

        <header className="grid gap-6 lg:grid-cols-[1fr_460px] lg:items-start">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-cyan-700 uppercase">
              {pet.featured ? "Featured Petdex entry" : "Petdex entry"}
            </p>
            <h1 className="mt-3 text-5xl font-semibold text-stone-950 md:text-7xl">
              {pet.displayName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
              {pet.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <LikeButton
                slug={pet.slug}
                initialCount={metrics.likeCount}
                initialLiked={initialLiked}
                signedIn={Boolean(userId)}
              />
              <span className="font-mono text-[11px] tracking-[0.18em] text-stone-500 uppercase">
                {metrics.installCount} installs · {metrics.zipDownloadCount} zip
                downloads
              </span>
            </div>
            {pet.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {pet.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#eef1ff] px-2.5 py-1 text-xs font-medium text-[#5266ea]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <InstallCommand slug={pet.slug} displayName={pet.displayName} />
        </header>

        <PetStateViewer src={pet.spritesheetPath} petName={pet.displayName} />

        <section className="grid gap-4 lg:grid-cols-3">
          {pet.submittedBy ? (
            <SubmittedBy credit={pet.submittedBy} />
          ) : (
            <InfoCard title="Submission" icon={<Sparkles className="size-4" />}>
              <p>Curated entry.</p>
              <p>Updated {new Date(pet.importedAt).toLocaleDateString()}</p>
            </InfoCard>
          )}
          <DownloadActions pet={pet} />
          <InfoCard title="Package" icon={<FileJson className="size-4" />}>
            <p>
              <span className="font-medium text-stone-950">pet.json:</span>{" "}
              <span className="break-all">{pet.petJsonPath}</span>
            </p>
            <p>
              <span className="font-medium text-stone-950">spritesheet:</span>{" "}
              <span className="break-all">{pet.spritesheetPath}</span>
            </p>
          </InfoCard>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/76 p-5 shadow-sm shadow-blue-950/5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
        {icon}
        {title}
      </div>
      <div className="mt-4 space-y-2 break-words text-sm leading-6 text-stone-600">
        {children}
      </div>
    </div>
  );
}
