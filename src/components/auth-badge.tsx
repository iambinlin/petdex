"use client";

import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Inbox, MessageSquare, Shield, Sparkles } from "lucide-react";

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
        <UserButtonWithAdminLinks />
      </Show>
    </>
  );
}

function UserButtonWithAdminLinks() {
  const { user } = useUser();
  // Admin gate is visibility-only. Every action still re-verifies on the
  // server via isAdmin() so a tampered client can't escalate.
  const showAdmin = isAdminClientSafe(user?.id);

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "size-9 rounded-full ring-1 ring-black/10",
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="My pets"
          labelIcon={<Sparkles className="size-4" />}
          href="/my-pets"
        />
        {showAdmin ? (
          <>
            <UserButton.Link
              label="Admin · review queue"
              labelIcon={<Shield className="size-4" />}
              href="/admin"
            />
            <UserButton.Link
              label="Admin · requests"
              labelIcon={<Inbox className="size-4" />}
              href="/admin/requests"
            />
            <UserButton.Link
              label="Admin · feedback"
              labelIcon={<MessageSquare className="size-4" />}
              href="/admin/feedback"
            />
          </>
        ) : null}
      </UserButton.MenuItems>
    </UserButton>
  );
}
