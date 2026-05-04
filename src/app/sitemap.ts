import type { MetadataRoute } from "next";

import { getAllApprovedPets } from "@/lib/pets";
import { PET_KINDS, PET_VIBES } from "@/lib/types";

const SITE = "https://petdex.crafter.run";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pets = await getAllApprovedPets();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/requests`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${SITE}/legal/takedown`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const vibeEntries: MetadataRoute.Sitemap = PET_VIBES.map((vibe) => ({
    url: `${SITE}/vibe/${vibe}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const kindEntries: MetadataRoute.Sitemap = PET_KINDS.map((kind) => ({
    url: `${SITE}/kind/${kind}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const petEntries: MetadataRoute.Sitemap = pets.map((pet) => ({
    url: `${SITE}/pets/${pet.slug}`,
    lastModified: pet.importedAt ? new Date(pet.importedAt) : now,
    changeFrequency: "weekly",
    priority: pet.featured ? 0.9 : 0.6,
  }));

  return [...staticEntries, ...vibeEntries, ...kindEntries, ...petEntries];
}
