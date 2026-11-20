import type { MetadataRoute } from "next";
import { atlasIndexable, atlasSiteUrl } from "@/lib/atlas-metadata";
import { FIELD_VELOCITY_GRAPHS, graphPath } from "@/data/field-velocity-links";
import { atlasPath } from "@/lib/atlas-path";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!atlasSiteUrl || !atlasIndexable) return [];
  // Redirect-only routes, query/filter permutations and chart hashes are excluded.
  return ["/", "/milestones", "/funding", "/field-velocity", "/methodology", ...FIELD_VELOCITY_GRAPHS.map(graphPath)].map(path => ({
    url: new URL(atlasPath(path), atlasSiteUrl).href,
  }));
}
