import type { NextConfig } from "next";
import { atlasBasePath } from "./src/lib/atlas-path";
import "./src/lib/atlas-metadata"; // Validate canonical/launch settings at build time too.

const nextConfig: NextConfig = {
  basePath: atlasBasePath,
  async redirects() {
    return [
      { source: "/regulatory-landscape", destination: "/milestones", permanent: false },
    ];
  },
};

export default nextConfig;
