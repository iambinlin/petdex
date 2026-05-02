import { notFound } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { FileJson, Sparkles } from "lucide-react";

import { db, schema } from "@/lib/db/client";
import { getMetricsForSlug } from "@/lib/db/metrics";
import { getPet, getStaticPetSlugs } from "@/lib/pets";

import { InstallCommand } from "@/components/install-command";
import { JsonLd } from "@/components/json-ld";
import { LikeButton } from "@/components/like-button";
import { PetActionMenu } from "@/components/pet-action-menu";
import { PetStateViewer } from "@/components/pet-state-viewer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubmittedBy } from "@/components/submitted-by";

const SITE_URL = "https://petdex.crafter.run";

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
      title: "Pet not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${pet.displayName} — Animated Codex pet`;
  const description = `Install ${pet.displayName} for the Codex CLI: ${pet.description} One command, animated pixel art, ${pet.tags.slice(0, 3).join(" + ") || "open source"}.`;
  const url = `${SITE_URL}/pets/${pet.slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/pets/${pet.slug}` },
    keywords: [
      pet.displayName,
      `${pet.displayName} Codex pet`,
      `${pet.displayName} pixel pet`,
      "Codex CLI pet",
      ...pet.tags.slice(0, 4),
      ...pet.vibes.slice(0, 2),
    ],
    openGraph: {
      title,
      description,
      url,
      type: "article",
      // images auto-injected from app/pets/[slug]/opengraph-image.tsx
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
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

  const url = `${SITE_URL}/pets/${pet.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": `${url}#pet`,
      name: pet.displayName,
      description: pet.description,
      url,
      image: pet.spritesheetPath,
      keywords: [...pet.tags, ...pet.vibes].join(", "),
      genre: pet.kind,
      datePublished: pet.importedAt,
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
      ...(pet.submittedBy
        ? {
            creator: {
              "@type": "Person",
              name: pet.submittedBy.name,
              ...(pet.submittedBy.url ? { url: pet.submittedBy.url } : {}),
              ...(pet.submittedBy.imageUrl
                ? { image: pet.submittedBy.imageUrl }
                : {}),
            },
          }
        : {}),
      ...(metrics.likeCount > 0
        ? {
            interactionStatistic: {
              "@type": "InteractionCounter",
              interactionType: "https://schema.org/LikeAction",
              userInteractionCount: metrics.likeCount,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Petdex",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Pets",
          item: `${SITE_URL}/#gallery`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: pet.displayName,
          item: url,
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8ff]">
      <JsonLd data={jsonLd} />
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
              <PetActionMenu
                pet={{
                  slug: pet.slug,
                  displayName: pet.displayName,
                  zipUrl: pet.zipUrl,
                  description: pet.description,
                }}
                variant="detail"
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

        <section className="grid gap-4 lg:grid-cols-2">
          {pet.submittedBy ? (
            <SubmittedBy credit={pet.submittedBy} />
          ) : (
            <InfoCard title="Submission" icon={<Sparkles className="size-4" />}>
              <p>Curated entry.</p>
              <p>Updated {new Date(pet.importedAt).toLocaleDateString()}</p>
            </InfoCard>
          )}
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
