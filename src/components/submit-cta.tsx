"use client";

import Link from "next/link";

import { SignInButton, useAuth } from "@clerk/nextjs";

type SubmitCTAProps = {
  className?: string;
  children?: React.ReactNode;
};

const DEFAULT_CLASS =
  "inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-stone-200";

export function SubmitCTA({
  className = DEFAULT_CLASS,
  children = "Submit a pet",
}: SubmitCTAProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return (
      <SignInButton
        mode="modal"
        forceRedirectUrl="/submit"
        signUpForceRedirectUrl="/submit"
      >
        <button type="button" className={className}>
          {children}
        </button>
      </SignInButton>
    );
  }

  return (
    <Link href="/submit" className={className}>
      {children}
    </Link>
  );
}
