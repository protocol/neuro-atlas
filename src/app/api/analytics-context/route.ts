import { analyticsContext } from "@/lib/atlas-analytics-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // The canonical host overwrites this policy header on every Atlas request.
  // It cannot override time/environment/ID eligibility, and absence requires consent.
  return Response.json(
    { ...analyticsContext(Date.now(), process.env.VERCEL_ENV, process.env.NEXT_PUBLIC_ATLAS_GA_ID),
      consentRequired: request.headers.get("x-atlas-consent-region") !== "open" },
    { headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
    } },
  );
}
