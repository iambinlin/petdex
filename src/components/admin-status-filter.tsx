"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FILTERS: Array<{
  value: "all" | "pending" | "approved" | "rejected" | "discovered";
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "discovered", label: "Discovered" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function AdminStatusFilter({
  counts,
}: {
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
    discovered: number;
  };
}) {
  const params = useSearchParams();
  const current = (params?.get("status") ?? "pending") as
    | "all"
    | "pending"
    | "approved"
    | "rejected"
    | "discovered";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => {
        const active = current === f.value;
        const href = f.value === "pending" ? "/admin" : `/admin?status=${f.value}`;
        const count = counts[f.value];
        return (
          <Link
            key={f.value}
            href={href}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
              active
                ? "border-inverse bg-inverse text-on-inverse"
                : "border-border-base bg-surface text-muted-2 hover:border-border-strong"
            }`}
          >
            {f.label}
            <span
              className={`font-mono text-[10px] ${
                active ? "text-on-inverse/60" : "text-muted-3"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
