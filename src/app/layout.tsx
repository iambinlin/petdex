import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";

import { AnnouncementModal } from "@/components/announcement-modal";
import { ProfileAnnouncementModal } from "@/components/profile-announcement-modal";
import { FeedbackWidget } from "@/components/feedback-widget";
import { OnboardingTour } from "@/components/onboarding-tour";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <FeedbackWidget />
          <OnboardingTour />
          <AnnouncementModal />
          <ProfileAnnouncementModal />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
