import { NextResponse } from "next/server";

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "@/i18n/config";

const isProtected = createRouteMatcher([
  "/submit",
  "/submit/(.*)",
  "/:locale/submit",
  "/:locale/submit/(.*)",
  "/api/submit",
  "/api/submit/(.*)",
  "/api/r2",
  "/api/r2/(.*)",
  "/admin",
  "/admin/(.*)",
  "/:locale/admin",
  "/:locale/admin/(.*)",
  "/api/admin",
  "/api/admin/(.*)",
  "/my-pets",
  "/my-pets/(.*)",
  "/:locale/my-pets",
  "/:locale/my-pets/(.*)",
  "/api/my-pets",
  "/api/my-pets/(.*)",
]);

const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }

  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals + static assets + SEO files (robots, sitemap)
    "/((?!_next|robots\\.txt|sitemap\\.xml|manifest\\.json|opengraph-image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
