import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/submit",
  "/submit/(.*)",
  "/api/submit",
  "/api/submit/(.*)",
  "/api/r2",
  "/api/r2/(.*)",
  "/admin",
  "/admin/(.*)",
  "/api/admin",
  "/api/admin/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals + static assets + SEO files (robots, sitemap)
    "/((?!_next|robots\\.txt|sitemap\\.xml|manifest\\.json|opengraph-image|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
