"use client";

import { useEffect, useState } from "react";

import { Apple, MousePointerClick, Package, Terminal } from "lucide-react";

import { CommandLine } from "@/components/command-line";

type InstallCommandProps = {
  slug: string;
  displayName: string;
};

type Platform = "macos" | "linux" | "windows";
type Tab = "cli" | "shell";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "macos";
  const ua = window.navigator.userAgent || "";
  const platform =
    (window.navigator as Navigator & { platform?: string }).platform ?? "";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "linux";
  return "macos";
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2c-2 0-3.4 1.6-3.4 3.6 0 .9.3 1.6.7 2.2-.5.6-.9 1.2-1.2 1.9-1.2.4-2.1 1.5-2.1 2.8 0 .8.3 1.5.8 2.1-.6 1.5-1.4 2.9-1.6 4.1-.2 1.3.5 2.1 1.7 2.5 1.1.4 2.4.5 3.7.5h2.8c1.3 0 2.6-.1 3.7-.5 1.2-.4 1.9-1.2 1.7-2.5-.2-1.2-1-2.6-1.6-4.1.5-.6.8-1.3.8-2.1 0-1.3-.9-2.4-2.1-2.8-.3-.7-.7-1.3-1.2-1.9.4-.6.7-1.3.7-2.2 0-2-1.4-3.6-3.4-3.6zm-1.4 4.5c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9zm2.8 0c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9zm-1.4 2.8c1 0 1.8.6 1.8 1.4 0 .3-.1.6-.3.8h-3c-.2-.2-.3-.5-.3-.8 0-.8.8-1.4 1.8-1.4z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3 5.6L11.2 4.5v6.8H3V5.6zm0 6.5h8.2v6.8L3 17.8v-5.7zm9 6.9v-7H21v8.5l-9-1.5zM12 4.4l9-1.4v8.3h-9V4.4z" />
    </svg>
  );
}

export function InstallCommand({ slug, displayName }: InstallCommandProps) {
  const [platform, setPlatform] = useState<Platform>("macos");
  const [tab, setTab] = useState<Tab>("cli");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const isWin = platform === "windows";
  const cliCmd = `npx petdex install ${slug}`;
  const shellCmd = isWin
    ? `irm https://petdex.crafter.run/install/${slug}?platform=ps1 | iex`
    : `curl -sSf https://petdex.crafter.run/install/${slug} | sh`;
  const command = tab === "cli" ? cliCmd : shellCmd;
  const shellLabel = isWin ? "PowerShell" : "Curl";

  return (
    <div className="rounded-2xl border border-black/10 bg-white/76 p-5 shadow-sm shadow-blue-950/5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          <Terminal className="size-4" />1. Install
        </div>
        <PlatformToggle platform={platform} onChange={setPlatform} />
      </div>

      <p className="mt-2 text-xs leading-5 text-stone-500">
        Drops the pet pack into{" "}
        <code className="break-all">
          {isWin
            ? `%USERPROFILE%\\.codex\\pets\\${slug}\\`
            : `~/.codex/pets/${slug}/`}
        </code>
      </p>

      <div
        role="tablist"
        aria-label="Install method"
        className="mt-3 flex items-center gap-0.5 rounded-full border border-black/10 bg-white/70 p-0.5 self-start w-fit"
      >
        <TabButton
          icon={<Package className="size-3.5" />}
          label="CLI"
          selected={tab === "cli"}
          onClick={() => setTab("cli")}
        />
        <TabButton
          icon={<Terminal className="size-3.5" />}
          label={shellLabel}
          selected={tab === "shell"}
          onClick={() => setTab("shell")}
        />
      </div>
      <CommandLine
        key={`${tab}-${platform}`}
        command={command}
        source={`pet-detail-${slug}-${tab}-${platform}`}
        className="mt-2 w-full"
      />

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-stone-950">
        <MousePointerClick className="size-4" />2. Activate in Codex
      </div>
      <ol className="mt-2 space-y-1 text-xs leading-5 text-stone-600">
        <li>
          Open Codex,{" "}
          <span className="font-mono text-stone-800">Settings</span>,{" "}
          <span className="font-mono text-stone-800">Appearance</span>,{" "}
          <span className="font-mono text-stone-800">Pets</span>.
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

function PlatformToggle({
  platform,
  onChange,
}: {
  platform: Platform;
  onChange: (p: Platform) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Install platform"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-black/10 bg-white/70 p-0.5"
    >
      <PlatformBtn
        active={platform === "macos"}
        onClick={() => onChange("macos")}
        icon={<Apple className="size-3.5" />}
        label="macOS"
      />
      <PlatformBtn
        active={platform === "linux"}
        onClick={() => onChange("linux")}
        icon={<LinuxIcon className="size-3.5" />}
        label="Linux"
      />
      <PlatformBtn
        active={platform === "windows"}
        onClick={() => onChange("windows")}
        icon={<WindowsIcon className="size-3.5" />}
        label="Windows"
      />
    </div>
  );
}

function PlatformBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      title={label}
      className={`inline-flex size-7 items-center justify-center rounded-full transition ${
        active ? "bg-black text-white" : "text-stone-600 hover:text-black"
      }`}
    >
      {icon}
    </button>
  );
}

function TabButton({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        selected
          ? "bg-black text-white"
          : "text-stone-600 hover:text-black"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
