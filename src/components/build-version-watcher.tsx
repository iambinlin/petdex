"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  fetchBuildVersion,
  isChunkLoadFailure,
} from "@/lib/build-version-check";

import { Button } from "@/components/ui/button";

const CHECK_INTERVAL_MS = 60_000;

type UpdateReason = "version" | "asset-load";

export function BuildVersionWatcher() {
  const t = useTranslations("buildUpdate");
  const currentVersionRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const checkingRef = useRef(false);
  const [updateReason, setUpdateReason] = useState<UpdateReason | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const showUpdatePrompt = useCallback((reason: UpdateReason) => {
    setUpdateReason((currentReason) => currentReason ?? reason);
  }, []);

  const checkVersion = useCallback(async () => {
    if (checkingRef.current || updateReason) {
      return;
    }

    checkingRef.current = true;

    try {
      const latestVersion = await fetchBuildVersion();

      if (!latestVersion) {
        return;
      }

      if (!currentVersionRef.current) {
        currentVersionRef.current = latestVersion;
        return;
      }

      if (latestVersion !== currentVersionRef.current) {
        showUpdatePrompt("version");
      }
    } finally {
      checkingRef.current = false;
    }
  }, [showUpdatePrompt, updateReason]);

  useEffect(() => {
    function clearForegroundInterval() {
      if (intervalRef.current === null) {
        return;
      }

      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    function startForegroundInterval() {
      if (updateReason || document.visibilityState !== "visible") {
        return;
      }

      clearForegroundInterval();
      intervalRef.current = window.setInterval(() => {
        void checkVersion();
      }, CHECK_INTERVAL_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        clearForegroundInterval();
        return;
      }

      void checkVersion();
      startForegroundInterval();
    }

    function handleFocus() {
      if (document.visibilityState === "visible") {
        void checkVersion();
      }
    }

    void checkVersion();
    startForegroundInterval();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearForegroundInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkVersion, updateReason]);

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      if (isChunkLoadFailure(event)) {
        showUpdatePrompt("asset-load");
      }
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (isChunkLoadFailure(event)) {
        showUpdatePrompt("asset-load");
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [showUpdatePrompt]);

  if (!updateReason || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[80] flex justify-center sm:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="build-update-prompt pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border-base bg-surface/94 p-2 shadow-[0_22px_70px_-36px_rgba(15,23,42,0.55),0_8px_24px_-18px_rgba(82,102,234,0.45)] ring-1 ring-white/50 backdrop-blur-xl dark:ring-white/5"
      >
        <span className="absolute inset-x-0 top-0 h-0.5 bg-brand" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3 px-1 pt-1 sm:px-2 sm:py-1.5">
            <span
              data-build-update-icon
              className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-tint text-brand-deep ring-1 ring-brand/20 dark:bg-brand-tint-dark dark:text-brand-light"
            >
              <RefreshCw className="size-4" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-semibold tracking-tight text-foreground">
                {t("title")}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-2">
                {t("body")}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="petdex-pill"
              size="sm"
              className="h-9 rounded-full bg-surface-muted/60 px-3 text-xs"
              onClick={() => setDismissed(true)}
            >
              <X className="size-3.5" />
              {t("later")}
            </Button>
            <Button
              type="button"
              variant="petdex-cta"
              size="sm"
              className="h-9 rounded-full px-4 text-xs shadow-sm shadow-blue-950/10"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-3.5" />
              {t("refresh")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
