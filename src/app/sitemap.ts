import type { MetadataRoute } from "next";

import { getAllApprovedPets } from "@/lib/pets";

const SITE = "https://petdex.crafter.run";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pets = await getAllApprovedPets();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/legal/takedown`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const petEntries: MetadataRoute.Sitemap = pets.map((pet) => ({
    url: `${SITE}/pets/${pet.slug}`,
    lastModified: pet.importedAt ? new Date(pet.importedAt) : new Date(),
    changeFrequency: "weekly",
    priority: pet.featured ? 0.9 : 0.6,
  }));

  return [...staticEntries, ...petEntries];
}
