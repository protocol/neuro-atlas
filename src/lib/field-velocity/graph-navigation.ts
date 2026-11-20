import { fieldVelocityGraph, graphPath, type FieldVelocityGraph } from "@/data/field-velocity-links";
import { atlasBasePath, atlasPath } from "@/lib/atlas-path";
import { recordingViewQuery, recordingViewToken } from "@/lib/recording-view";
import { readStandaloneChartSettings, standaloneChartParams, standaloneChartStateKeys } from "@/lib/standalone-chart-state";

export const overviewPath = "/field-velocity";
export const nativeOverviewPath = atlasPath(overviewPath);
const privateQuery = /^(?:access[_-]?token|auth(?:orization)?|code|credential(?:s)?|id[_-]?token|key|password|secret|session(?:id)?|token|api[_-]?key|signature)$/i;

/** App navigation retains same-origin query multiplicity; sharing is stricter. */
function graphSearch(source: URL, entry: FieldVelocityGraph) {
  const params = new URLSearchParams(source.search);
  for (const key of Array.from(params.keys())) if (privateQuery.test(key)) params.delete(key);
  if (entry.graph.renderer !== "recording" || !recordingViewToken(source)) params.delete(recordingViewQuery);
  standaloneChartStateKeys.forEach(key => params.delete(key));
  params.delete("brainScale");
  params.delete("extrapolation");
  standaloneChartParams(entry, readStandaloneChartSettings(source, entry)).forEach((value, key) => params.set(key, value));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function legacyGraphDestination(current: string, basePath = atlasBasePath) {
  if (basePath && !/^(\/[a-z0-9_-]+)+$/i.test(basePath)) return null;
  let source: URL;
  try { source = new URL(current); } catch { return null; }
  if (!/^https?:$/.test(source.protocol) || source.pathname.replace(/\/$/, "") !== `${basePath}${overviewPath}`) return null;
  const entry = fieldVelocityGraph(source.hash.slice(1));
  return entry ? `${basePath}${graphPath(entry)}${graphSearch(source, entry)}` : null;
}

export function graphNavigationHref(anchor: string, current?: string) {
  const entry = fieldVelocityGraph(anchor);
  if (!entry) return undefined;
  return atlasPath(graphPath(entry)) + (current ? graphSearch(new URL(current), entry) : "");
}
