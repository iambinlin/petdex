"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}> = [
  {
    href: "/admin",
    label: "Submissions",
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/edits",
    label: "Edits",
    match: (p) => p.startsWith("/admin/edits"),
  },
  {
    href: "/admin/requests",
    label: "Requests",
    match: (p) => p.startsWith("/admin/requests"),
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    match: (p) => p.startsWith("/admin/feedback"),
  },
  {
    href: "/admin/manifest",
    label: "Manifest",
    match: (p) => p.startsWith("/admin/manifest"),
  },
];

export function AdminTabs() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav
      aria-label="Admin sections"
      className="flex items-center gap-1 border-b border-border-base"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px relative inline-flex h-10 items-center px-4 text-sm transition ${
              active
                ? "font-medium text-foreground"
                : "text-muted-3 hover:text-muted-1"
            }`}
          >
            {tab.label}
            {active ? (
              <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full bg-brand" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
