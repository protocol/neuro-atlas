import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { atlasBasePath } from "./lib/atlas-path";
import { atlasSiteUrl } from "./lib/atlas-metadata";
import {
  ATLAS_LAUNCH_AT, authenticatePreviewForm, hasBasicAccess, hasPreviewCookie,
  isAllowedAuthOrigin, safeReturnTo,
} from "./lib/launch-access";
import { renderLaunchGate } from "./lib/launch-gate";

// Owner-managed deployment secret only. Missing configuration stays closed before launch.
const PASSWORD = process.env.ATLAS_PREVIEW_PASSWORD;

function privateResponse(response: Response, nonce?: string): Response {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  if (nonce) response.headers.set("Content-Security-Policy", [
    "default-src 'none'", `script-src 'nonce-${nonce}'`, `style-src 'nonce-${nonce}'`,
    "img-src data:", "connect-src 'none'", "base-uri 'none'", "form-action 'self'",
    "frame-ancestors 'none'", "object-src 'none'",
  ].join("; "));
  return response;
}

function gate(now: number, basePath: string, returnTo: string, error?: string): Response {
  const nonce = randomBytes(18).toString("base64");
  return privateResponse(new NextResponse(renderLaunchGate({ now, nonce, returnTo, basePath, error }), {
    status: 401, headers: { "Content-Type": "text/html; charset=utf-8" },
  }), nonce);
}

function isDocumentRequest(req: NextRequest, basePath: string): boolean {
  const path = req.nextUrl.pathname.startsWith(`${basePath}/`)
    ? req.nextUrl.pathname.slice(basePath.length) : req.nextUrl.pathname;
  const destination = req.headers.get("sec-fetch-dest");
  return req.method === "GET" && !!req.headers.get("accept")?.toLowerCase().includes("text/html")
    && (!destination || destination === "document")
    && !["rsc", "next-router-prefetch", "next-router-state-tree", "next-action"].some((header) => req.headers.has(header))
    && !/^\/(?:api|_next)(?:\/|$)/.test(path) && !/\/[^/]*\.[^/]*$/.test(path);
}

export async function proxy(req: NextRequest) {
  const now = Date.now();
  if (now >= ATLAS_LAUNCH_AT) return NextResponse.next();
  const basePath = req.nextUrl.basePath || atlasBasePath;
  const path = req.nextUrl.pathname === `${basePath}/__launch/auth` ? "/__launch/auth" : req.nextUrl.pathname;
  if (path === "/__launch/auth" && req.method === "POST") {
    const canonicalOrigin = atlasSiteUrl ? new URL(atlasSiteUrl).origin : undefined;
    if (!isAllowedAuthOrigin(req, canonicalOrigin)) {
      return privateResponse(new NextResponse("Invalid request origin.", { status: 403 }));
    }
    const { response, returnTo } = await authenticatePreviewForm(req, PASSWORD, now, basePath);
    return response ? privateResponse(response) : gate(now, basePath, returnTo, "That password didn’t match. Please try again.");
  }
  if (PASSWORD && (hasBasicAccess(req.headers.get("authorization"), PASSWORD)
    || hasPreviewCookie(req.headers.get("cookie"), PASSWORD, now))) {
    return privateResponse(NextResponse.next());
  }
  if (isDocumentRequest(req, basePath)) {
    const url = new URL(req.url);
    return gate(now, basePath, safeReturnTo(url.pathname + url.search, basePath));
  }
  return privateResponse(new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": 'Basic realm="Neuro Atlas", charset="UTF-8"',
    },
  }));
}

export const config = {
  // Explicit root also covers the bare mount; no static/data-bundle exemptions.
  matcher: ["/", "/:path*"],
};
