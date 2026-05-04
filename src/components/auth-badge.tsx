"use client";

import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { MessageSquare, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

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
  const unread = useUnreadFeedback();

  return (
    <div className="relative">
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
          <UserButton.Link
            label={unread > 0 ? `My feedback (${unread})` : "My feedback"}
            labelIcon={<MessageSquare className="size-4" />}
            href="/my-feedback"
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
      {unread > 0 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-[#5266ea] font-mono text-[9px] font-semibold text-white ring-2 ring-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </div>
  );
}

function useUnreadFeedback(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/feedback/unread", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { count?: number };
        if (!stop) setCount(j.count ?? 0);
      } catch {
        /* silent */
      }
    }
    void load();
    const interval = setInterval(() => void load(), 60000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, []);
  return count;
}
