import { performanceTarget } from "@/data/field-velocity-links";

export const neuronReferenceQuery = "neuronRefs";
export const NEURON_REFERENCE_IDS = ["mouse", "macaque", "human"] as const;
export const ALL_NEURON_REFERENCES = NEURON_REFERENCE_IDS.join(",");
export const neuronReferenceTarget = "metric-panel-largest-connectome-neurons";

/** A stable binary snapshot; valid legacy nonempty subsets all enable the group. */
export function neuronReferencesFromUrl(url: URL, anchor: string): string {
  if (performanceTarget(anchor) !== neuronReferenceTarget
    || performanceTarget(url.hash.slice(1)) !== neuronReferenceTarget) return "none";
  const values = url.searchParams.getAll(neuronReferenceQuery);
  if (values.length !== 1) return "none";
  if (values[0] === "none") return "none";
  const ids = values[0].split(",");
  if (new Set(ids).size !== ids.length || ids.some(id => !NEURON_REFERENCE_IDS.some(known => known === id))) return "none";
  return ALL_NEURON_REFERENCES;
}

/** Default-off carries no token; all references share one explicit on state. */
export function neuronReferenceToken(selection: string) {
  return selection === ALL_NEURON_REFERENCES ? ALL_NEURON_REFERENCES : undefined;
}
