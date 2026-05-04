import type { Metadata } from "next";

import "./globals.css";

const SITE_NAME = "Petdex";
const SITE_URL = "https://petdex.crafter.run";
const SITE_DESCRIPTION =
  "Petdex is the public gallery of animated pixel pets for the Codex CLI. Browse 70+ open-source companions, preview their animations, and install one with a single command.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Petdex — Animated pixel pets for the Codex CLI",
    template: "%s | Petdex",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Codex pet",
    "Codex CLI pet",
    "OpenAI Codex pets",
    "pixel pet",
    "animated pet",
    "developer mascot",
    "terminal pet",
    "Codex companion",
    "petdex",
  ],
  authors: [{ name: "Crafter Station", url: "https://crafter.run" }],
  creator: "Crafter Station",
  publisher: "Crafter Station",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Petdex — Animated pixel pets for the Codex CLI",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Petdex" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Petdex — Animated pixel pets for the Codex CLI",
    description: SITE_DESCRIPTION,
    images: ["/og-twitter.png"],
    creator: "@raillyhugo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The locale layout owns html/body so Next 16 can set lang from [locale];
  // providers and widgets live there to stay inside the document and receive locale context.
  return children;
}
