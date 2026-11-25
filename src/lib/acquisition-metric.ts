import type { DraftPlot } from "./draft-chart-types";
import { compactCount, countWords } from "./large-count-label";
import { BRAIN_IMAGE_MODEL, brainImageVoxels, type BrainBenchmarkContext } from "./connectomics-brain-benchmarks";

export const ACQUISITION_METRICS = [
  { id: "voxels-per-dollar", label: "Voxels per $", axis: "Approx. voxels/$ (log)" },
  { id: "dollars-per-voxel", label: "$ per voxel", axis: "Approx. $ per voxel (log)" },
] as const;
export type AcquisitionMetric = typeof ACQUISITION_METRICS[number]["id"];
export const ACQUISITION_CHART_TITLE = "Estimated acquisition efficiency";
export const HUMAN_IMAGE_VOXELS = brainImageVoxels(BRAIN_IMAGE_MODEL.volumesMm3.human);
export const ACQUISITION_HUMAN_COST_NOTE = "Illustrative image-acquisition cost: 1.875×10²¹ voxels (~1.9 sextillion), at 4×4×40 nm across 1,200,000 mm³, ÷ source-estimated voxels per dollar. Preparation, reconstruction, proofreading and storage costs remain additional. Optical and EM estimates use different scopes and resolutions.";

function scientific(value: number, digits: number) {
  const [mantissa, exponent] = value.toExponential(digits - 1).split("e");
  const superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return `${Number(mantissa)}×10${String(Number(exponent)).replace(/[-\d]/g, char => char === "-" ? "⁻" : superscript[Number(char)])}`;
}
/** Display-only precision; human-brain is a point-detail format, not an axis. */
export function acquisitionNumber(value: number, metric: AcquisitionMetric | "human-brain", digits = 4): string {
  if (metric === "voxels-per-dollar") return Math.abs(value) > 1e15 ? scientific(value, digits) : countWords(value);
  if (metric === "dollars-per-voxel" || Math.abs(value) > 1e15) return `$${scientific(value, digits)}`;
  const rounded = Number(value.toPrecision(digits));
  const scale = ([ [1e15, "Q"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"] ] as const).find(([unit]) => Math.abs(rounded) >= unit);
  return `$${Number((value / (scale?.[0] ?? 1)).toPrecision(digits))}${scale?.[1] ?? ""}`;
}
export function acquisitionAxisTick(value: number, metric: AcquisitionMetric) {
  if (metric === "voxels-per-dollar") return value > 1e15 ? value.toExponential(0).replace("e+", "e") : compactCount(value);
  const prefixes = [[1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"], [1e-18, "a"], [1e-21, "z"], [1e-24, "y"]] as const;
  const rounded = Number(value.toPrecision(3));
  let index = prefixes.findIndex(([unit]) => rounded >= unit);
  // 0.1 n$ is narrower than 100 p$ in the actual chart font; keep the
  // original point/x-axis geometry and readable type instead of shrinking it.
  if (index > 0 && rounded / prefixes[index][0] >= 100) index -= 1;
  const scale = prefixes[index];
  return scale ? `${Number((value / scale[0]).toPrecision(3))} ${scale[1]}$` : `$${value.toExponential(0)}`;
}

// The archived renderer shares this ID but stores $/voxel. Never reciprocate it
// as though it were the current canonical efficiency projection.
export function supportsAcquisitionMetrics(plot: DraftPlot) {
  return plot.id === "acquisition-economics" && plot.yLabel === "Approx. voxels/$ (log)";
}
export function acquisitionValue(efficiency: number, metric: AcquisitionMetric) {
  return metric === "voxels-per-dollar" ? efficiency : 1 / efficiency;
}
export function acquisitionEfficiency(value: number, metric: AcquisitionMetric) {
  return acquisitionValue(value, metric);
}
export function acquisitionBenchmark(context: BrainBenchmarkContext, metric: AcquisitionMetric): BrainBenchmarkContext | undefined {
  return metric === "voxels-per-dollar" ? context : undefined;
}
export function acquisitionMetricPlot(source: DraftPlot, metric: AcquisitionMetric) {
  const axis = ACQUISITION_METRICS.find(option => option.id === metric)!.axis;
  const transformation = metric === "voxels-per-dollar" ? "efficiency" : "1 / efficiency";
  const unit = metric === "voxels-per-dollar" ? "voxels/$" : "$ per voxel";
  const fitNote = `Fit diagnostics (equation, intercept, slope, R² and doubling time) retain original voxels/$ units. Display transformation: ${transformation}; selected y unit: ${unit}.`;
  return {
    ...source, title: `${ACQUISITION_CHART_TITLE} — ${ACQUISITION_METRICS.find(option => option.id === metric)!.label}`, yLabel: axis, previewYLabel: metric === "voxels-per-dollar" ? source.previewYLabel : axis,
    acquisitionView: { metric, unit, transformation, fitBasis: "voxels/$" },
    points: source.points.map(point => ({ ...point, y: acquisitionValue(point.y, metric),
      exportAnnotation: metric === "voxels-per-dollar" ? point.exportAnnotation : point.exportAnnotation?.replace(/≈[^·]+vox\/\$/, `${point.qualifier ?? "≈"}${acquisitionNumber(acquisitionValue(point.y, metric), metric)} per voxel`),
    })),
    referenceTrendlines: source.referenceTrendlines?.map(line => ({
      ...line, points: line.points.map(point => ({ ...point, y: acquisitionValue(point.y, metric) })),
      note: `${fitNote} ${line.note}`,
      directLabel: metric === "voxels-per-dollar" ? line.directLabel : `${line.directLabel?.split(" · ")[0] ?? line.id} · cost halves every ${line.fit?.doublingYears?.toFixed(1)}y`,
      label: metric === "voxels-per-dollar" ? line.label : `${line.id === "em" ? "EM" : "Expansion"} fit · cost halves every ${line.fit?.doublingYears?.toFixed(1)}y`,
    })),
  };
}
