"use client";

import { Fragment, useState } from "react";

import { track } from "@vercel/analytics";
import { Check, Copy } from "lucide-react";

type CommandLineProps = {
  command: string;
  /** Lighter prefix prepended without being copied (eg. "$ "). Visual only. */
  prefix?: string;
  /** Tracking event payload key. */
  source?: string;
  className?: string;
};

// Soft, light-on-light syntax: command word in brand blue, subcommands darker,
// flags accent-violet, paths/strings stone, pipes/redirects muted.
function tokenize(command: string): React.ReactNode {
  const parts = command.split(/(\s+|\||&&|\|\||;)/g).filter((s) => s !== "");
  let cmdSeen = false;
  let firstWordSeen = false;

  return parts.map((p, i) => {
    if (/^\s+$/.test(p)) {
      return <Fragment key={i}>{p}</Fragment>;
    }
    if (p === "|" || p === "&&" || p === "||" || p === ";") {
      return (
        <span key={i} className="text-stone-400">
          {p}
        </span>
      );
    }
    if (!firstWordSeen) {
      firstWordSeen = true;
      cmdSeen = true;
      return (
        <span key={i} className="font-medium text-[#3847f5]">
          {p}
        </span>
      );
    }
    if (p.startsWith("-")) {
      return (
        <span key={i} className="text-[#5266ea]">
          {p}
        </span>
      );
    }
    if (cmdSeen && /^[a-z][a-z0-9-]*$/.test(p)) {
      cmdSeen = false;
      return (
        <span key={i} className="font-medium text-[#1a1d2e]">
          {p}
        </span>
      );
    }
    return (
      <span key={i} className="text-stone-700">
        {p}
      </span>
    );
  });
}

export function CommandLine({
  command,
  prefix = "$ ",
  source,
  className = "",
}: CommandLineProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      track("command_line_copied", {
        command: command.slice(0, 80),
        source: source ?? "unknown",
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label="Copy command"
      style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
      className={`group inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/76 px-3 py-2 text-left text-[12px] text-[#1a1d2e] backdrop-blur transition hover:border-[#6478f6]/40 hover:bg-white ${className}`}
    >
      <span className="select-none text-[#3847f5]/60">{prefix}</span>
      <span className="flex-1 truncate">{tokenize(command)}</span>
      <span className="grid size-6 shrink-0 place-items-center rounded-md text-stone-500 transition group-hover:bg-[#eef1ff] group-hover:text-[#3847f5]">
        {copied ? (
          <Check className="size-3.5 text-[#3847f5]" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </button>
  );
}
