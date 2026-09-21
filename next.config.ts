import type { NextConfig } from "next";
import { atlasBasePath } from "./src/lib/atlas-path";
import { atlasSiteUrl, atlasIndexable } from "./src/lib/atlas-metadata";

const nextConfig: NextConfig = {
  basePath: atlasBasePath,
  async headers() {
    // Emit from Atlas itself: an external proxy may discard its own added headers.
    return atlasSiteUrl && !atlasIndexable ? [{
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }] : [];
  },
  async redirects() {
    // Only legacy, unprefixed URLs move. PLRD proxies /neuro-atlas through this
    // same origin; redirecting the prefixed namespace would create a loop.
    const canonicalOrigin = atlasSiteUrl ? new URL(atlasSiteUrl).origin : undefined;
    const legacyRedirects = atlasBasePath === "/neuro-atlas" && canonicalOrigin
      ? [
          { source: "/", path: "" },
          ...["milestones", "funding", "field-velocity", "methodology", "ecosystem"].map((page) => ({
            source: `/${page}/:path*`, path: `/${page}/:path*`,
          })),
          { source: "/regulatory-landscape", path: "/milestones" },
        ].map(({ source, path }) => ({
          source,
          destination: `${canonicalOrigin}${atlasBasePath}${path}`,
          basePath: false as const,
          permanent: false as const,
        }))
      : [];
    return [
      ...legacyRedirects,
      { source: "/regulatory-landscape", destination: "/milestones", permanent: false },
    ];
  },
};

export default nextConfig;
