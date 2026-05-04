import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { AnnouncementModal } from "@/components/announcement-modal";
import { FeedbackWidget } from "@/components/feedback-widget";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ProfileAnnouncementModal } from "@/components/profile-announcement-modal";
import { AppProviders } from "@/components/theme-providers";

import { hasLocale, locales } from "@/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            {children}
            <FeedbackWidget />
            <OnboardingTour />
            <AnnouncementModal />
            <ProfileAnnouncementModal />
            <Analytics />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
