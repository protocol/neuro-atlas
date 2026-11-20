import { FIELD_VELOCITY_GRAPHS } from "@/data/field-velocity-links";
import { atlasBasePath } from "@/lib/atlas-path";
import { legacyGraphDestination, overviewPath } from "@/lib/field-velocity/graph-navigation";

const retiredPath = `${overviewPath}/dashboard`;
const graphs = new Map(FIELD_VELOCITY_GRAPHS.map(entry => [entry.slug, entry]));

/** Read-only compatibility: one validated chart destination, never composition state. */
export function legacyComparisonDestination(current: string, basePath = atlasBasePath): string | null {
  if (basePath && !/^(\/[a-z0-9_-]+)+$/i.test(basePath)) return null;
  let source: URL;
  try { source = new URL(current); } catch { return null; }
  if (!/^https?:$/.test(source.protocol) || source.pathname.replace(/\/$/, "") !== `${basePath}${retiredPath}`) return null;
  const fallback = `${basePath}${overviewPath}`;
  const add = source.searchParams.getAll("add");
  // Encoded comparisons are retired with the composer; do not decode or restore them.
  const entry = !source.hash && add.length === 1 ? graphs.get(add[0]) : undefined;
  if (!entry) return fallback;
  source.searchParams.delete("add");
  source.pathname = `${basePath}${overviewPath}`;
  source.hash = entry.slug;
  // Reuse historic navigation's secret filtering and exact recording-view validation.
  return legacyGraphDestination(source.href, basePath) ?? fallback;
}
