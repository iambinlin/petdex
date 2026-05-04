import { notFound } from "next/navigation";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";

import { db, schema } from "@/lib/db/client";
import { getMetricsForSlug } from "@/lib/db/metrics";
import { resolveOwnerCreditFor } from "@/lib/owner-credit";
import { getPet, getStaticPetSlugs } from "@/lib/pets";

import { InstallCommand } from "@/components/install-command";
import { JsonLd } from "@/components/json-ld";
import { LikeButton } from "@/components/like-button";
import { OwnerEditPanel } from "@/components/owner-edit-panel";
import { PetActionMenu } from "@/components/pet-action-menu";
import { PetStateViewer } from "@/components/pet-state-viewer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ClaimCTA } from "@/components/claim-cta";
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

  // Pull the underlying row once: gives us the ownerId for the profile
  // link plus the pending-edit state when the viewer is the owner.
  const ownerRow = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.slug, slug),
  });
  // Resolve the "submitted by" credit live from Clerk so name/url/avatar
  // reflect the user's *current* profile (not the snapshot taken at
  // submit time). Falls back to row.credit_* for orphan rows.
  const ownerCredit = ownerRow
    ? await resolveOwnerCreditFor({
        ownerId: ownerRow.ownerId,
        creditName: ownerRow.creditName,
        creditUrl: ownerRow.creditUrl,
        creditImage: ownerRow.creditImage,
        // For 'discover' rows the ownerId is the admin who imported
        // on the author's behalf, NOT the author. Use stored credit_*
        // exclusively so the author keeps the byline. After someone
        // claims the row source flips to 'claimed' and we go back to
        // resolving from the live Clerk profile.
        ownerIsProxy: ownerRow.source === "discover",
      })
    : null;

  let ownerEditState:
    | {
        isOwner: boolean;
        petId: string;
        currentTags: string[];
        pending: {
          displayName: string | null;
          description: string | null;
          tags: string[] | null;
          submittedAt: string | null;
        } | null;
        lastRejection: string | null;
      }
    | null = null;
  if (userId && ownerRow && ownerRow.ownerId === userId) {
    const hasPending = Boolean(ownerRow.pendingSubmittedAt);
    ownerEditState = {
      isOwner: true,
      petId: ownerRow.id,
      currentTags: (ownerRow.tags as string[]) ?? [],
      pending: hasPending
        ? {
            displayName: ownerRow.pendingDisplayName,
            description: ownerRow.pendingDescription,
            tags: (ownerRow.pendingTags as string[] | null) ?? null,
            submittedAt: ownerRow.pendingSubmittedAt
              ? ownerRow.pendingSubmittedAt.toISOString()
              : null,
          }
        : null,
      lastRejection: ownerRow.pendingRejectionReason,
    };
  }

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
      ...(ownerCredit
        ? {
            creator: {
              "@type": "Person",
              name: ownerCredit.name,
              ...(ownerCredit.externals[0]
                ? { url: ownerCredit.externals[0].url }
                : {}),
              ...(ownerCredit.imageUrl
                ? { image: ownerCredit.imageUrl }
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
    <main className="min-h-screen bg-background">
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
            <h1 className="mt-3 text-5xl font-semibold text-stone-950 md:text-7xl dark:text-stone-100">
              {pet.displayName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700 dark:text-stone-300">
              {pet.description}
            </p>

            {ownerCredit ? (
              <div className="mt-6 max-w-md">
                <SubmittedBy credit={ownerCredit} />
                {/* Discovered = an admin imported this on the author's
                    behalf. Surface a 'sign in to claim' nudge for any
                    viewer who isn't already the matching author. */}
                {ownerRow?.source === "discover" ? (
                  <ClaimCTA
                    petName={pet.displayName}
                    authorLabel={ownerCredit.name}
                    githubUrl={
                      ownerCredit.externals.find(
                        (e) => e.provider === "github",
                      )?.url ?? null
                    }
                  />
                ) : null}
              </div>
            ) : null}

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
              <span className="font-mono text-[11px] tracking-[0.18em] text-stone-500 uppercase dark:text-stone-400">
                {metrics.installCount} installs · {metrics.zipDownloadCount} zip
                downloads
              </span>
            </div>
            {pet.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {pet.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand dark:bg-brand-tint-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {ownerEditState ? (
              <div className="mt-6">
                <OwnerEditPanel
                  petId={ownerEditState.petId}
                  slug={pet.slug}
                  currentDisplayName={pet.displayName}
                  currentDescription={pet.description}
                  currentTags={ownerEditState.currentTags}
                  initialPending={ownerEditState.pending}
                  initialRejection={ownerEditState.lastRejection}
                />
              </div>
            ) : null}
          </div>

          <InstallCommand slug={pet.slug} displayName={pet.displayName} />
        </header>

        <PetStateViewer src={pet.spritesheetPath} petName={pet.displayName} />

        {!ownerCredit ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Submission" icon={<Sparkles className="size-4" />}>
              <p>Curated entry.</p>
              <p>Updated {new Date(pet.importedAt).toLocaleDateString()}</p>
            </InfoCard>
          </section>
        ) : null}
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
    <div className="rounded-2xl border border-black/10 bg-white/76 p-5 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-stone-900/76">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950 dark:text-stone-100">
        {icon}
        {title}
      </div>
      <div className="mt-4 space-y-2 break-words text-sm leading-6 text-stone-600 dark:text-stone-400">
        {children}
      </div>
    </div>
  );
}
