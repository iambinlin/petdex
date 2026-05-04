"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Inbox, MessageSquare, Shield } from "lucide-react";

const TABS: Array<{
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Match prefix so /admin/requests/foo also marks the requests tab. */
  match: (pathname: string) => boolean;
}> = [
  {
    href: "/admin",
    label: "Submissions",
    icon: <Shield className="size-3.5" />,
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/requests",
    label: "Requests",
    icon: <Inbox className="size-3.5" />,
    match: (p) => p.startsWith("/admin/requests"),
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    icon: <MessageSquare className="size-3.5" />,
    match: (p) => p.startsWith("/admin/feedback"),
  },
];

export function AdminTabs() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav
      aria-label="Admin sections"
      className="flex flex-wrap items-center gap-2 rounded-full border border-black/[0.06] bg-white p-1 shadow-[0_4px_16px_-8px_rgba(56,71,245,0.16)]"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition ${
              active
                ? "bg-black text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-black"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
