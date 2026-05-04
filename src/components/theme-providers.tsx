"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Wraps next-themes around the app and syncs Clerk's appearance with
// the resolved theme so the SignIn modal, UserButton dropdown and
// hosted account pages all respect the toggle. ClerkProvider lives
// inside ThemeProvider because we need useTheme() to drive its
// appearance prop.
function ClerkWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: until next-themes has resolved the
  // client-side theme we render Clerk with no baseTheme (light), then
  // upgrade to dark on the next paint when applicable. Mirrors the
  // standard next-themes guard.
  const baseTheme = mounted && resolvedTheme === "dark" ? dark : undefined;

  return (
    <ClerkProvider appearance={{ baseTheme }}>{children}</ClerkProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkWithTheme>{children}</ClerkWithTheme>
    </ThemeProvider>
  );
}
