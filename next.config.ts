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
    return [
      { source: "/regulatory-landscape", destination: "/milestones", permanent: false },
    ];
  },
};

export default nextConfig;
