import type { Metadata } from "next";
import { atlasPath } from "./atlas-path";

export const atlasDescription = "An interactive atlas of neurotechnology — milestones, BCI funding, and field velocity.";
export const atlasSiteUrl = process.env.ATLAS_SITE_URL || undefined;
export const atlasIndexable = process.env.ATLAS_INDEXABLE === "true";

if (atlasSiteUrl) {
  // Validate the literal first: URL() alone silently repairs malformed authorities.
  if (!/^https:\/\/[^/\\\s?#@]+\/?$/.test(atlasSiteUrl)) {
    throw new Error("ATLAS_SITE_URL must be an HTTPS origin only, e.g. https://www.plrd.org");
  }
  try {
    const url = new URL(atlasSiteUrl);
    if (!url.hostname || url.username || url.password || url.pathname !== "/") throw new Error();
  } catch {
    throw new Error("ATLAS_SITE_URL must be a valid HTTPS origin");
  }
}
if (![undefined, "", "true", "false"].includes(process.env.ATLAS_INDEXABLE) || (atlasIndexable && !atlasSiteUrl)) {
  throw new Error("ATLAS_INDEXABLE must be true or false; true requires ATLAS_SITE_URL");
}

/** Absolute URLs avoid Next metadataBase's surprising path-composition rules. */
export function atlasMetadata(path: string, title: string, description = atlasDescription): Metadata {
  const basic = { title, description };
  if (!atlasSiteUrl) return basic;
  const canonical = new URL(atlasPath(path), atlasSiteUrl).href;
  return {
    ...basic,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "Neuro Atlas", type: "website" },
    robots: { index: atlasIndexable, follow: atlasIndexable },
  };
}
