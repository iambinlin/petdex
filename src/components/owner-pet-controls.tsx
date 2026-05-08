"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@clerk/nextjs";

import { OwnerEditPanel } from "@/components/owner-edit-panel";
import { SuggestCollectionButton } from "@/components/suggest-collection-button";

type Pending = {
  displayName: string | null;
  description: string | null;
  tags: string[] | null;
  submittedAt: string | null;
};

type OwnerState = {
  isOwner: boolean;
  petId: string | null;
  currentTags: string[];
  pending: Pending | null;
  lastRejection: string | null;
  collectionSuggest: {
    candidates: Array<{ slug: string; title: string }>;
    alreadyRequested: string[];
  } | null;
};

type OwnerPetControlsProps = {
  slug: string;
  currentDisplayName: string;
  currentDescription: string;
  render?: "edit" | "suggestions";
};

export function OwnerPetControls({
  slug,
  currentDisplayName,
  currentDescription,
  render = "edit",
}: OwnerPetControlsProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<OwnerState | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setState(null);
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/pets/${slug}/owner-state`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OwnerState | null) => setState(data))
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setState(null);
      });

    return () => controller.abort();
  }, [isLoaded, isSignedIn, slug]);

  if (!state?.isOwner || !state.petId) return null;

  if (render === "suggestions") {
    if (!state.collectionSuggest?.candidates.length) return null;
    return (
      <SuggestCollectionButton
        petSlug={slug}
        petDisplayName={currentDisplayName}
        candidateCollections={state.collectionSuggest.candidates}
        alreadyRequested={state.collectionSuggest.alreadyRequested}
      />
    );
  }

  return (
    <OwnerEditPanel
      petId={state.petId}
      slug={slug}
      currentDisplayName={currentDisplayName}
      currentDescription={currentDescription}
      currentTags={state.currentTags}
      initialPending={state.pending}
      initialRejection={state.lastRejection}
    />
  );
}
