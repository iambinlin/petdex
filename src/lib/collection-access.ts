import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { isAdmin } from "@/lib/admin";

type Metadata = Record<string, unknown>;

function isRecord(value: unknown): value is Metadata {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasCreatorCollectionMetadata(metadata: unknown): boolean {
  if (!isRecord(metadata)) return false;
  if (metadata.canCreateCollections === true) return true;
  const petdex = metadata.petdex;
  return isRecord(petdex) && petdex.canCreateCollections === true;
}

export async function canManageCreatorCollections(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  if (isAdmin(userId)) return true;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return hasCreatorCollectionMetadata(user.privateMetadata);
  } catch {
    return false;
  }
}
