"use client";

import { useState } from "react";

import { track } from "@vercel/analytics";
import { Check, Copy, MousePointerClick, Terminal } from "lucide-react";

type InstallCommandProps = {
  slug: string;
  displayName: string;
};

export function InstallCommand({ slug, displayName }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  const command = `curl -sSf https://petdex.crafter.run/install/${slug} | sh`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      track("install_command_copied", { slug, displayName });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/76 p-5 shadow-sm shadow-blue-950/5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
        <Terminal className="size-4" />1. Install
      </div>
      <p className="mt-2 text-xs leading-5 text-stone-500">
        Drops the pet pack into <code>~/.codex/pets/{slug}/</code>.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-stone-950 px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-emerald-200">
          {command}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label="Copy command"
          className="grid size-7 shrink-0 place-items-center rounded-md text-stone-300 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-stone-950">
        <MousePointerClick className="size-4" />2. Activate in Codex
      </div>
      <ol className="mt-2 space-y-1 text-xs leading-5 text-stone-600">
        <li>
          Open Codex →{" "}
          <span className="font-mono text-stone-800">Settings</span> →{" "}
          <span className="font-mono text-stone-800">Appearance</span> →{" "}
          <span className="font-mono text-stone-800">Pets</span>
        </li>
        <li>
          Find <strong className="text-stone-800">{displayName}</strong> under{" "}
          <span className="font-mono text-stone-800">Custom pets</span> and
          click <span className="font-mono text-stone-800">Select</span>.
        </li>
        <li>
          Use <code className="rounded bg-stone-100 px-1.5 py-0.5">/pet</code>{" "}
          inside Codex to wake or tuck it away.
        </li>
      </ol>
    </div>
  );
}
