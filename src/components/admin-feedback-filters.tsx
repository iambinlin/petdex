"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "pending" | "addressed" | "archived" | "all";
type Kind = "all" | "suggestion" | "bug" | "praise" | "other";

const STATUS_FILTERS: Array<{ value: Status; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "addressed", label: "Addressed" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const KIND_FILTERS: Array<{ value: Kind; label: string }> = [
  { value: "all", label: "All kinds" },
  { value: "suggestion", label: "Suggestion" },
  { value: "bug", label: "Bug" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
];

function buildHref(status: Status, kind: Kind): string {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (kind !== "all") params.set("kind", kind);
  const qs = params.toString();
  return qs ? `/admin/feedback?${qs}` : "/admin/feedback";
}

export function AdminFeedbackFilters({
  statusCounts,
  kindCounts,
}: {
  statusCounts: Record<Status, number>;
  kindCounts: Record<Kind, number>;
}) {
  const params = useSearchParams();
  const currentStatus = (params?.get("status") ?? "pending") as Status;
  const currentKind = (params?.get("kind") ?? "all") as Kind;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = currentStatus === f.value;
          const count = statusCounts[f.value];
          return (
            <Link
              key={f.value}
              href={buildHref(f.value, currentKind)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                active
                  ? "border-inverse bg-inverse text-on-inverse"
                  : "border-black/10 bg-surface text-muted-2 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
              }`}
            >
              {f.label}
              <span
                className={`font-mono text-[10px] ${
                  active ? "text-white/60" : "text-stone-400"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {KIND_FILTERS.map((f) => {
          const active = currentKind === f.value;
          const count = kindCounts[f.value];
          return (
            <Link
              key={f.value}
              href={buildHref(currentStatus, f.value)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition ${
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-black/10 bg-surface text-muted-3 hover:border-black/30"
              }`}
            >
              {f.label}
              <span
                className={`font-mono text-[10px] ${
                  active ? "text-brand/70" : "text-stone-400"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
