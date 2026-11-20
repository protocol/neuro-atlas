import { recordingViewQuery, recordingViewToken } from "@/lib/recording-view";
import type { ChartExplorationSettings } from "@/components/chart-exploration-context";
import { fieldVelocityGraph, type FieldVelocityGraph } from "@/data/field-velocity-links";
import { chartToggle } from "@/lib/chart-toggle-url";

/** Single-chart, bounded public vocabulary. Labels stay in the renderer's source contract. */
const bitrateSeries = [
  ["cursor", "Cursor / grid control"],
  ["switch", "Endovascular switch"],
  ["text", "Text selection / scanning"],
  ["speech", "Speech decoding"],
  ["handwriting", "Handwriting decoding"],
] as const;
export const standaloneChartStateKeys = ["chartHidden", "chartModel", "chartBaseline"] as const;
const modelKeys = ["extrapolate", "sensory", "benchmark", "voxels"] as const;
const modelTokens = ["fit", "sensory", "brain-scale", "voxels"] as const;

function contract(entry: FieldVelocityGraph): { series: readonly (readonly [string, string])[]; models: readonly string[]; baseline: boolean } {
  const plot = entry.graph.renderer === "draft" ? entry.graph.plot : "";
  const series = plot === "bci-bitrate" ? bitrateSeries : plot === "acquisition-economics" ? [
    ["expansion", "Expansion microscopy · estimates"], ["em", "EM · reported-tech estimates"],
    ["mesospim", "mesoSPIM · optical"], ["peem", "PEEM · prospective"],
  ] as const : entry.graph.renderer === "recording" ? [
    ["historical", "historical"], ["electrical", "electrical"], ["human-channels", "human-channels"], ["optical", "optical"],
  ] as const : entry.target === "publication-output" ? [
    ["neurotech", "neurotech"], ["all-research", "all-research"], ["four-domain", "four-domain"],
  ] as const : entry.graph.renderer === "trends" ? [
    ["neurotechnology", "neurotechnology"], ["bci", "brain-computer interface"],
  ] as const : [];
  const models = plot === "bci-bitrate" ? ["fit", "sensory"] : plot === "acquisition-economics" ? ["fit", "brain-scale"]
    : plot === "tissue-cm3" ? ["brain-scale", "voxels"] : plot === "public-data-size" ? ["brain-scale"]
    : plot === "recording-hours" ? ["fit"] : [];
  return { series, models, baseline: entry.target === "publication-growth" };
}

/** Repetition, duplicate/unknown tokens, wrong chart scope, and oversized values default safely. */
function tokens(url: URL, key: typeof standaloneChartStateKeys[number], slug: string, allowed: readonly string[]) {
  const values = url.searchParams.getAll(key);
  if (values.length !== 1 || values[0].length > 512 || !values[0].startsWith(`${slug}:`)) return [];
  const entries = values[0].slice(slug.length + 1).split(",");
  return entries.length <= allowed.length && new Set(entries).size === entries.length && entries.every(token => allowed.includes(token)) ? entries : [];
}

export function readStandaloneChartSettings(url: URL, entry: FieldVelocityGraph): ChartExplorationSettings {
  const pathSlug = url.pathname.match(/\/field-velocity\/([^/]+)\/?$/)?.[1];
  const source = pathSlug ?? (/\/field-velocity\/?$/.test(url.pathname) ? fieldVelocityGraph(url.hash.slice(1))?.slug : undefined);
  if (source !== entry.slug) return {};
  const { series, models, baseline } = contract(entry);
  const hidden = tokens(url, "chartHidden", entry.slug, series.map(([token]) => token));
  const enabled = tokens(url, "chartModel", entry.slug, models);
  // Merged #138 published chart-qualified toggle URLs before standalone pages.
  // Source identity above is mandatory; explicit new state takes precedence,
  // including invalid new state (never revive a stale legacy switch).
  const legacy = chartToggle(entry.target);
  const legacyValues = legacy ? url.searchParams.getAll(legacy.query) : [];
  if (!url.searchParams.has("chartModel") && legacy && legacyValues.length === 1 && legacyValues[0] === legacy.value) {
    const token = legacy.query === "brainScale" ? "brain-scale" : "fit";
    if (models.includes(token)) enabled.push(token);
  }
  return {
    ...(hidden.length ? { hidden: series.filter(([token]) => hidden.includes(token)).map(([, label]) => label) } : {}),
    ...Object.fromEntries(modelKeys.flatMap((key, i) => enabled.includes(modelTokens[i]) ? [[key, true]] : [])),
    ...(baseline && tokens(url, "chartBaseline", entry.slug, ["matched"]).length ? { growthBaseline: "matched" as const } : {}),
  };
}

/** Canonical settings only, in fixed registry order. Defaults consume no URL space. */
export function standaloneChartParams(entry: FieldVelocityGraph, settings: ChartExplorationSettings) {
  const { series, models, baseline } = contract(entry);
  const params = new URLSearchParams();
  const hidden = series.filter(([, label]) => settings.hidden?.includes(label)).map(([token]) => token);
  const enabled = modelTokens.filter((token, i) => models.includes(token) && settings[modelKeys[i]]);
  if (hidden.length) params.set("chartHidden", `${entry.slug}:${hidden.join(",")}`);
  if (enabled.length) params.set("chartModel", `${entry.slug}:${enabled.join(",")}`);
  if (baseline && settings.growthBaseline === "matched") params.set("chartBaseline", `${entry.slug}:matched`);
  return params;
}

export function updateStandaloneChartUrl(url: URL, entry: FieldVelocityGraph, change: Partial<ChartExplorationSettings>) {
  const settings = { ...readStandaloneChartSettings(url, entry), ...change };
  const result = new URL(url);
  standaloneChartStateKeys.forEach(key => result.searchParams.delete(key));
  result.searchParams.delete("brainScale");
  result.searchParams.delete("extrapolation");
  if (entry.graph.renderer === "recording") {
    const view = recordingViewToken(url);
    result.searchParams.delete(recordingViewQuery);
    if (view && view !== "historical") result.searchParams.set(recordingViewQuery, view);
  }
  standaloneChartParams(entry, settings).forEach((value, key) => result.searchParams.set(key, value));
  return result;
}
