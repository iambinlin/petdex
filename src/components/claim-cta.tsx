"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { track } from "@vercel/analytics";
import { ArrowRight } from "lucide-react";

// Inline "Is this you?" prompt shown on /pets/[slug] for discovered
// pets when the viewer is either signed-out or signed in as someone
// other than the listed author. Pushes them to sign in with the
// expectation that the claim banner on /my-pets will pick the row
// up automatically (case-insensitive github match landed earlier).
export function ClaimCTA({
  petName,
  authorLabel,
  githubUrl,
}: {
  petName: string;
  authorLabel: string;
  githubUrl: string | null;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return null;

  // If signed in and the viewer's github already matches, hide. The
  // /my-pets banner will surface the actual claim button there. We
  // only check github match here — if their email matches but no
  // github linked, the banner still shows so they're nudged into
  // adding GitHub OAuth which makes the claim cleaner.
  if (isSignedIn && githubUrl && user) {
    const externals = (user.externalAccounts ?? []) as Array<{
      provider?: string;
      username?: string;
    }>;
    const myGh = externals.find((a) => a.provider === "oauth_github")?.username;
    if (myGh) {
      const myGhUrl = `https://github.com/${myGh}`.toLowerCase();
      if (myGhUrl === githubUrl.toLowerCase()) return null;
    }
  }

  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 text-xs font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:hover:bg-stone-200">
      Sign in to claim
      <ArrowRight className="size-3.5" />
    </span>
  );

  return (
    <aside className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
      <span className="flex-1">
        Is this your pet,{" "}
        <strong className="font-semibold">{authorLabel}</strong>? Sign in with
        GitHub to claim {petName}, edit details, and track installs.
      </span>
      {isSignedIn ? (
        // Already signed in — direct them to /my-pets where the claim
        // banner does the actual transfer.
        <a
          href="/my-pets"
          onClick={() => track("claim_cta_clicked", { signed_in: true })}
          className="inline-flex h-8 items-center"
        >
          {inner}
        </a>
      ) : (
        <SignInButton
          mode="modal"
          forceRedirectUrl="/my-pets"
          fallbackRedirectUrl="/my-pets"
        >
          <button
            type="button"
            onClick={() => track("claim_cta_clicked", { signed_in: false })}
            className="inline-flex h-8 items-center"
          >
            {inner}
          </button>
        </SignInButton>
      )}
    </aside>
  );
}
