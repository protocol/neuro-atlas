import { performanceTarget } from "@/data/field-velocity-links";

export const neuronReferenceQuery = "neuronRefs";
export const NEURON_REFERENCE_IDS = ["mouse", "macaque", "human"] as const;
export const ALL_NEURON_REFERENCES = NEURON_REFERENCE_IDS.join(",");
export const neuronReferenceTarget = "metric-panel-largest-connectome-neurons";

/** A stable primitive snapshot; only an exact single chart-qualified selection is read. */
export function neuronReferencesFromUrl(url: URL, anchor: string): string {
  if (performanceTarget(anchor) !== neuronReferenceTarget
    || performanceTarget(url.hash.slice(1)) !== neuronReferenceTarget) return ALL_NEURON_REFERENCES;
  const values = url.searchParams.getAll(neuronReferenceQuery);
  if (values.length !== 1) return ALL_NEURON_REFERENCES;
  if (values[0] === "none") return "none";
  const ids = values[0].split(",");
  if (new Set(ids).size !== ids.length || ids.some(id => !NEURON_REFERENCE_IDS.some(known => known === id))) return ALL_NEURON_REFERENCES;
  return NEURON_REFERENCE_IDS.filter(id => ids.includes(id)).join(",");
}

/** Default all-on omits the parameter; the empty subset is explicit. */
export function neuronReferenceToken(selection: string) {
  return selection === ALL_NEURON_REFERENCES ? undefined : selection;
}
