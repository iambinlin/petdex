"use client";

import { useState } from "react";

import { Play } from "lucide-react";

import { defaultPetState, type PetStateId, petStates } from "@/lib/pet-states";

import { PetSprite } from "@/components/pet-sprite";

type PetStateViewerProps = {
  src: string;
  petName: string;
};

export function PetStateViewer({ src, petName }: PetStateViewerProps) {
  const [selectedState, setSelectedState] = useState<PetStateId>(
    defaultPetState.id,
  );
  const activeState =
    petStates.find((state) => state.id === selectedState) ?? defaultPetState;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
      <section className="rounded-lg border border-border-base bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
              State viewer
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {activeState.label}
            </h2>
          </div>
          <span className="inline-flex h-9 items-center gap-2 rounded-md bg-surface-muted px-3 text-xs font-medium text-muted-2">
            <Play className="size-3.5" />
            {activeState.frames} frames
          </span>
        </div>

        <div className="pet-checkerboard mt-6 flex min-h-80 items-center justify-center rounded-lg border border-border-base">
          <PetSprite
            src={src}
            state={activeState.id}
            scale={1.2}
            label={`${petName} ${activeState.label} animation`}
          />
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-2">
          {activeState.purpose}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {petStates.map((state) => (
          <button
            key={state.id}
            type="button"
            onClick={() => setSelectedState(state.id)}
            className={`rounded-lg border bg-surface p-4 text-left transition ${
              selectedState === state.id
                ? "border-brand ring-2 ring-brand/20"
                : "border-border-base hover:border-border-strong"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {state.label}
                </p>
                <p className="mt-1 text-xs text-muted-3">
                  Row {state.row} - {state.frames} frames
                </p>
              </div>
              <div className="rounded-md border border-border-base bg-surface-muted p-2">
                <PetSprite src={src} state={state.id} scale={0.32} />
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
