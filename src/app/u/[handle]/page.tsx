import Link from "next/link";
import { notFound } from "next/navigation";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { Heart, TerminalSquare } from "lucide-react";

import { handleFromClerk, userIdForHandle } from "@/lib/handles";
import { db, schema } from "@/lib/db/client";
import { getMetricsBySlugs } from "@/lib/db/metrics";
import { rowToPet, type PetWithMetrics } from "@/lib/pets";
import { petStates } from "@/lib/pet-states";
import { MAX_PINNED_PETS } from "@/lib/profiles";

import { JsonLd } from "@/components/json-ld";
import { PetCard } from "@/components/facet-page";
import { PetSprite } from "@/components/pet-sprite";
import { ProfileAnalytics } from "@/components/profile-analytics";
import { ProfileExternalLink } from "@/components/profile-external-link";
import { ProfileInlineEditor } from "@/components/profile-inline-editor";
import { ProfilePinButton } from "@/components/profile-pin-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

const SITE_URL = "https://petdex.crafter.run";

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { handle } = await params;
  const userId = await userIdForHandle(handle);
  if (!userId) return { title: "Profile not found", robots: { index: false } };
  let displayName = `@${handle}`;
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    displayName = name || (u.username ? `@${u.username}` : `@${handle}`);
  } catch {
    /* fall back */
  }
  return {
    title: `${displayName} on Petdex`,
    description: `Pets created by ${displayName} for the Codex CLI.`,
    alternates: { canonical: `/u/${handle}` },
    openGraph: {
      title: `${displayName} on Petdex`,
      description: `Animated Codex pets created by ${displayName}.`,
      url: `${SITE_URL}/u/${handle}`,
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const ownerId = await userIdForHandle(handle);
  if (!ownerId) notFound();

  // Pull Clerk profile.
  let displayName: string | null = null;
  let username: string | null = null;
  let avatarUrl: string | null = null;
  let externalUrls: { url: string; label: string }[] = [];
  let memberSince: number | null = null;
  try {
    const client = await clerkClient();
    const u = await client.users.getUser(ownerId);
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    displayName = name || u.username || null;
    username = u.username ?? null;
    avatarUrl = u.imageUrl ?? null;
    memberSince = u.createdAt ?? null;
    for (const acc of u.externalAccounts ?? []) {
      const account = acc as { username?: string; provider: string };
      if (!account.username) continue;
      if (account.provider === "oauth_github") {
        externalUrls.push({
          url: `https://github.com/${account.username}`,
          label: `github.com/${account.username}`,
        });
      } else if (
        account.provider === "oauth_x" ||
        account.provider === "oauth_twitter"
      ) {
        externalUrls.push({
          url: `https://x.com/${account.username}`,
          label: `x.com/${account.username}`,
        });
      }
    }
  } catch {
    /* will render with handle only */
  }

  // Profile customization (bio, featured slug).
  const profile = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.userId, ownerId),
  });
  const bio = profile?.bio ?? null;
  const featuredSlugs =
    (profile?.featuredPetSlugs as string[] | undefined) ?? [];

  // Approved pets by this user.
  const rows = await db
    .select()
    .from(schema.submittedPets)
    .where(
      and(
        eq(schema.submittedPets.ownerId, ownerId),
        eq(schema.submittedPets.status, "approved"),
      ),
    )
    .orderBy(desc(schema.submittedPets.approvedAt));

  const slugs = rows.map((r) => r.slug);
  const metrics = slugs.length
    ? await getMetricsBySlugs(slugs)
    : new Map<string, { likeCount: number; installCount: number; zipDownloadCount: number }>();

  const pets: PetWithMetrics[] = rows.map((row) => ({
    ...rowToPet(row),
    metrics: metrics.get(row.slug) ?? {
      installCount: 0,
      zipDownloadCount: 0,
      likeCount: 0,
    },
  }));

  // Resolve pinned slugs to full pet objects, preserving owner-chosen
  // order. Drop any that are no longer approved (would otherwise break
  // the layout with empty cards).
  const featuredSet = new Set(featuredSlugs);
  const featuredPets = featuredSlugs
    .map((slug) => pets.find((p) => p.slug === slug))
    .filter((p): p is PetWithMetrics => Boolean(p));
  const restPets = pets.filter((p) => !featuredSet.has(p.slug));

  // Aggregate stats.
  const totalLikes = pets.reduce((acc, p) => acc + p.metrics.likeCount, 0);
  const totalInstalls = pets.reduce((acc, p) => acc + p.metrics.installCount, 0);

  // Viewer detection.
  const { userId: viewerId } = await auth();
  const isOwner = viewerId === ownerId;

  const fallbackInitial = (displayName ?? username ?? handle)
    .slice(0, 1)
    .toUpperCase();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName ?? username ?? `@${handle}`,
      url: `${SITE_URL}/u/${handle}`,
      ...(avatarUrl ? { image: avatarUrl } : {}),
      ...(externalUrls.length > 0
        ? { sameAs: externalUrls.map((e) => e.url) }
        : {}),
    },
  };

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#050505]">
      <JsonLd data={jsonLd} />
      <ProfileAnalytics
        handle={handle}
        petCount={pets.length}
        pinnedCount={featuredPets.length}
        viewerIsOwner={isOwner}
      />

      <section className="petdex-cloud relative overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pt-5 pb-10 md:px-8">
          <SiteHeader />

          <header className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-[auto_1fr_auto] lg:items-start">
            {/* Avatar */}
            <div className="flex justify-center lg:block">
              {avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: Clerk-hosted avatar
                <img
                  src={avatarUrl}
                  alt={displayName ?? `@${handle}`}
                  className="size-28 rounded-3xl object-cover ring-1 ring-black/10 md:size-32"
                />
              ) : (
                <div className="grid size-28 place-items-center rounded-3xl bg-white font-mono text-3xl font-semibold text-stone-700 ring-1 ring-black/10 md:size-32">
                  {fallbackInitial}
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="text-center lg:text-left">
              <p className="font-mono text-xs tracking-[0.22em] text-[#5266ea] uppercase">
                Petdex creator
              </p>
              <h1 className="mt-3 text-balance text-[40px] leading-[1] font-semibold tracking-tight md:text-[56px]">
                {displayName ?? `@${handle}`}
              </h1>
              {username ? (
                <p className="mt-2 font-mono text-sm tracking-[0.08em] text-stone-500">
                  @{username}
                </p>
              ) : null}
              {bio ? (
                <p className="mt-4 max-w-xl text-balance text-base leading-7 text-[#202127] md:text-lg">
                  {bio}
                </p>
              ) : null}

              {/* Stats row */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.18em] text-stone-500 uppercase lg:justify-start">
                <span>
                  {pets.length} {pets.length === 1 ? "pet" : "pets"}
                </span>
                {totalLikes > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="size-3" />
                    {totalLikes}
                  </span>
                ) : null}
                {totalInstalls > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <TerminalSquare className="size-3" />
                    {totalInstalls} installs
                  </span>
                ) : null}
                {memberSince ? (
                  <span>
                    joined{" "}
                    {new Date(memberSince).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ) : null}
              </div>

              {/* External links */}
              {externalUrls.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {externalUrls.map((e) => (
                    <ProfileExternalLink
                      key={e.url}
                      handle={handle}
                      url={e.url}
                      label={e.label}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Owner action */}
            <div className="flex justify-center lg:justify-end">
              {isOwner ? (
                <ProfileInlineEditor
                  handle={handle}
                  initialBio={bio}
                  initialFeaturedSlugs={featuredSlugs}
                  approvedPets={pets.map((p) => ({
                    slug: p.slug,
                    displayName: p.displayName,
                  }))}
                />
              ) : null}
            </div>
          </header>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        {pets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 p-12 text-center">
            <p className="font-mono text-xs tracking-[0.22em] text-stone-500 uppercase">
              No approved pets yet
            </p>
            <p className="mt-3 text-base text-stone-700">
              {isOwner
                ? "Once you submit a pet and it gets approved, it'll show up here."
                : "This creator hasn't shipped a public pet yet."}
            </p>
            {isOwner ? (
              <Link
                href="/submit"
                className="mt-5 inline-flex h-10 items-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85"
              >
                Submit your first pet
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            {featuredPets.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] tracking-[0.22em] text-[#5266ea] uppercase">
                    ★ Pinned
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-stone-400 uppercase">
                    {featuredPets.length} of {MAX_PINNED_PETS}
                  </p>
                </div>
                {featuredPets.length === 1 ? (
                  <div className="relative">
                    {isOwner ? (
                      <div className="absolute top-4 right-4">
                        <ProfilePinButton
                          slug={featuredPets[0].slug}
                          isPinned
                          pinnedCount={featuredPets.length}
                          maxPins={MAX_PINNED_PETS}
                        />
                      </div>
                    ) : null}
                    <FeaturedPin pet={featuredPets[0]} />
                  </div>
                ) : (
                  <div
                    className={`grid gap-4 md:gap-5 ${
                      featuredPets.length === 2
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-2 lg:grid-cols-3"
                    }`}
                  >
                    {featuredPets.map((pet, index) => (
                      <div key={pet.slug} className="relative">
                        <PetCard
                          pet={pet}
                          index={index}
                          stateCount={petStates.length}
                        />
                        {isOwner ? (
                          <div className="absolute top-3 right-14">
                            <ProfilePinButton
                              slug={pet.slug}
                              isPinned
                              pinnedCount={featuredPets.length}
                              maxPins={MAX_PINNED_PETS}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {restPets.length > 0 ? (
              <div className="space-y-4">
                {featuredPets.length > 0 ? (
                  <p className="font-mono text-[11px] tracking-[0.22em] text-stone-500 uppercase">
                    All pets
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-5">
                  {restPets.map((pet, index) => (
                    <div key={pet.slug} className="relative">
                      <PetCard
                        pet={pet}
                        index={index + featuredPets.length}
                        stateCount={petStates.length}
                      />
                      {isOwner ? (
                        <div className="absolute top-3 right-14">
                          <ProfilePinButton
                            slug={pet.slug}
                            isPinned={false}
                            pinnedCount={featuredPets.length}
                            maxPins={MAX_PINNED_PETS}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function FeaturedPin({ pet }: { pet: PetWithMetrics }) {
  return (
    <Link
      href={`/pets/${pet.slug}`}
      aria-label={`Open ${pet.displayName}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#6478f6]/45 bg-white/80 backdrop-blur transition hover:bg-white hover:shadow-xl hover:shadow-blue-950/10 md:flex-row md:items-stretch"
      style={{
        boxShadow:
          "0 0 0 1px rgba(100,120,246,0.18), 0 18px 45px -22px rgba(82,102,234,0.5)",
      }}
    >
      <div
        className="flex shrink-0 items-center justify-center px-8 py-10 md:w-[420px] md:py-14"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95) 0%, rgba(238,241,255,0.55) 55%, transparent 80%)",
        }}
      >
        <PetSprite
          src={pet.spritesheetPath}
          cycleStates
          scale={1.1}
          label={`${pet.displayName} animated`}
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 border-t border-black/[0.06] p-6 md:border-t-0 md:border-l">
        <span className="font-mono text-[11px] tracking-[0.22em] text-[#5266ea] uppercase">
          ★ Pinned
        </span>
        <h2 className="text-3xl font-semibold tracking-tight text-stone-950 md:text-4xl">
          {pet.displayName}
        </h2>
        <p className="max-w-2xl text-base leading-7 text-stone-700">
          {pet.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.18em] text-stone-500 uppercase">
          {pet.metrics.likeCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-3" />
              {pet.metrics.likeCount}
            </span>
          ) : null}
          {pet.metrics.installCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <TerminalSquare className="size-3" />
              {pet.metrics.installCount} installs
            </span>
          ) : null}
          <span>{pet.kind}</span>
        </div>
      </div>
    </Link>
  );
}
