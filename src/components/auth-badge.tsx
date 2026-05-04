"use client";

import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Shield, Sparkles } from "lucide-react";

import { isAdminClientSafe } from "@/lib/admin";

export function AuthBadge() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white/70 px-4 text-sm font-medium text-black backdrop-blur transition hover:bg-white"
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButtonWithAdminLink />
      </Show>
    </>
  );
}

function UserButtonWithAdminLink() {
  const { user } = useUser();
  // Visibility-only check; server still re-verifies admin actions via
  // isAdmin(). Tampering only exposes the entry, never escalates rights.
  const showAdmin = isAdminClientSafe(user?.id);

  return (
    <UserButton
      appearance={{
        elements: { avatarBox: "size-9 rounded-full ring-1 ring-black/10" },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="My pets"
          labelIcon={<Sparkles className="size-4" />}
          href="/my-pets"
        />
        {showAdmin ? (
          <UserButton.Link
            label="Admin"
            labelIcon={<Shield className="size-4" />}
            href="/admin"
          />
        ) : null}
      </UserButton.MenuItems>
    </UserButton>
  );
}
