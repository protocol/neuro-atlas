import { performanceTarget } from "@/data/field-velocity-links";

// Tokens are stable chart identities, not arbitrary booleans that could silently
// enable a different chart when only the fragment changes.
const chartToggles: Record<string, { query: string; value: string }> = {
  "metric-panel-public-data-size": { query: "brainScale", value: "public-data-size" },
  "metric-panel-acquisition-economics": { query: "brainScale", value: "acquisition-economics" },
  "neural-recording-hours": { query: "extrapolation", value: "neural-recording-hours" },
};

export function chartToggle(anchor: string) {
  return chartToggles[performanceTarget(anchor)];
}

/** Only an exact, single chart-qualified token enables its own chart. */
export function chartToggleEnabled(url: URL, anchor: string) {
  const toggle = chartToggle(anchor);
  if (!toggle || performanceTarget(url.hash.slice(1)) !== performanceTarget(anchor)) return false;
  const values = url.searchParams.getAll(toggle.query);
  return values.length === 1 && values[0] === toggle.value;
}
