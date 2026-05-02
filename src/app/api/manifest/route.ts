import { NextResponse } from "next/server";

import { getAllPetsPackPath, getPetPackPath } from "@/lib/downloads";
import { getPets } from "@/lib/pets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const origin = new URL(req.url).origin;
  const pets = await getPets();

  const items = pets.map((pet) => {
    // Curated pets have local pack zips at /packs/<slug>.zip
    // Community pets live in R2/UT — link the original zipUrl from DB instead.
    const isCurated = pet.spritesheetPath.startsWith("/pets/");
    return {
      slug: pet.slug,
      displayName: pet.displayName,
      description: pet.description,
      kind: pet.kind,
      vibes: pet.vibes,
      tags: pet.tags,
      featured: pet.featured ?? false,
      submittedBy: pet.submittedBy?.name ?? null,
      installCommand: `curl -sSf ${origin}/install/${pet.slug} | sh`,
      pageUrl: `${origin}/pets/${pet.slug}`,
      packPath: isCurated ? getPetPackPath(pet.slug) : null,
      spritesheetUrl: pet.spritesheetPath.startsWith("http")
        ? pet.spritesheetPath
        : `${origin}${pet.spritesheetPath}`,
      petJsonUrl: pet.petJsonPath.startsWith("http")
        ? pet.petJsonPath
        : `${origin}${pet.petJsonPath}`,
    };
  });

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      total: items.length,
      featured: items.filter((p) => p.featured).length,
      allPetsPackPath: getAllPetsPackPath(),
      pets: items,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
