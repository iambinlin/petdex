import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export type ResolvedPet = {
  slug: string;
  displayName: string;
  petJsonUrl: string;
  spritesheetUrl: string;
  spriteExt: "webp" | "png";
};

export async function resolveInstallablePet(
  slug: string,
  _origin: string,
): Promise<ResolvedPet | null> {
  const submitted = await db.query.submittedPets.findFirst({
    where: eq(schema.submittedPets.slug, slug),
  });
  if (!submitted || submitted.status !== "approved") return null;
  return {
    slug,
    displayName: submitted.displayName,
    petJsonUrl: submitted.petJsonUrl,
    spritesheetUrl: submitted.spritesheetUrl,
    spriteExt: submitted.spritesheetUrl.endsWith(".png") ? "png" : "webp",
  };
}

export function posixInstallScript(pet: ResolvedPet): string {
  const { slug, displayName, petJsonUrl, spritesheetUrl, spriteExt } = pet;
  return [
    "#!/bin/sh",
    `# Petdex installer for "${displayName}"`,
    `# https://petdex.crafter.run/pets/${slug}`,
    "",
    "set -e",
    "",
    `PET_DIR="$HOME/.codex/pets/${slug}"`,
    "",
    `echo "Installing ${displayName} into $PET_DIR"`,
    'mkdir -p "$PET_DIR"',
    "",
    `curl -fsSL -o "$PET_DIR/pet.json" '${petJsonUrl}'`,
    `curl -fsSL -o "$PET_DIR/spritesheet.${spriteExt}" '${spritesheetUrl}'`,
    "",
    `echo "Installed: ${displayName}"`,
    'echo "  Path: $PET_DIR"',
    'echo ""',
    'echo "Activate it inside Codex:"',
    'echo "  Settings -> Appearance -> Pets -> select your pet"',
    'echo ""',
    'echo "Then use /pet inside Codex to wake or tuck it away."',
    "",
  ].join("\n");
}

export function powershellInstallScript(pet: ResolvedPet): string {
  const { slug, displayName, petJsonUrl, spritesheetUrl, spriteExt } = pet;
  // Quote single-quotes safely for embedding into PowerShell single-quoted strings.
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  return [
    `# Petdex installer for "${displayName}"`,
    `# https://petdex.crafter.run/pets/${slug}`,
    "",
    "$ErrorActionPreference = 'Stop'",
    `$slug = ${q(slug)}`,
    "$petDir = Join-Path $HOME (Join-Path '.codex' (Join-Path 'pets' $slug))",
    "",
    `Write-Host "Installing ${displayName.replace(/"/g, '`"')} into $petDir"`,
    "New-Item -ItemType Directory -Force -Path $petDir | Out-Null",
    "",
    `Invoke-WebRequest -Uri ${q(petJsonUrl)} -OutFile (Join-Path $petDir 'pet.json') -UseBasicParsing`,
    `Invoke-WebRequest -Uri ${q(spritesheetUrl)} -OutFile (Join-Path $petDir ${q(`spritesheet.${spriteExt}`)}) -UseBasicParsing`,
    "",
    `Write-Host "Installed: ${displayName.replace(/"/g, '`"')}"`,
    'Write-Host "  Path: $petDir"',
    'Write-Host ""',
    'Write-Host "Activate it inside Codex:"',
    'Write-Host "  Settings -> Appearance -> Pets -> select your pet"',
    'Write-Host ""',
    'Write-Host "Then use /pet inside Codex to wake or tuck it away."',
    "",
  ].join("\n");
}

export function posixNotFoundScript(slug: string): string {
  return [
    "#!/bin/sh",
    `echo "Pet '${slug}' not found in Petdex." >&2`,
    'echo "Browse pets at https://petdex.crafter.run" >&2',
    "exit 1",
    "",
  ].join("\n");
}

export function powershellNotFoundScript(slug: string): string {
  return [
    `Write-Error "Pet '${slug}' not found in Petdex."`,
    'Write-Error "Browse pets at https://petdex.crafter.run"',
    "exit 1",
    "",
  ].join("\n");
}
