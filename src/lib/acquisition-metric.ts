import type { DraftPlot, DraftTrendline } from "./draft-chart-types";
import { compactCount, countWords } from "./large-count-label";
import { BRAIN_IMAGE_MODEL, brainImageVoxels, type BrainBenchmarkContext } from "./connectomics-brain-benchmarks";

export const ACQUISITION_METRICS = [
  { id: "voxels-per-dollar", label: "Voxels per $", axis: "Approx. voxels/$ (log)" },
  { id: "dollars-per-voxel", label: "$ per voxel", axis: "Approx. $ per voxel (log)" },
  { id: "human-brain", label: "$ per human brain", axis: "Approx. $ to image one human brain (log)" },
] as const;
export type AcquisitionMetric = typeof ACQUISITION_METRICS[number]["id"];
export const ACQUISITION_CHART_TITLE = "Estimated acquisition efficiency";
export const HUMAN_IMAGE_VOXELS = brainImageVoxels(BRAIN_IMAGE_MODEL.volumesMm3.human);
export const ACQUISITION_HUMAN_COST_NOTE = "Cost per human brain = 1.875×10²¹ voxels ÷ demonstrated voxels per dollar. Image acquisition only; excludes preparation, reconstruction, proofreading and storage, which have historically dominated total cost.";

function scientific(value: number, digits: number) {
  const [mantissa, exponent] = value.toExponential(digits - 1).split("e");
  const superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return `${Number(mantissa)}×10${String(Number(exponent)).replace(/[-\d]/g, char => char === "-" ? "⁻" : superscript[Number(char)])}`;
}
/** Display-only precision; never round the projected coordinates. */
export function acquisitionNumber(value: number, metric: AcquisitionMetric, digits = 4): string {
  if (metric === "voxels-per-dollar") return Math.abs(value) > 1e15 ? scientific(value, digits) : countWords(value);
  if (metric === "dollars-per-voxel" || Math.abs(value) > 1e15) return `$${scientific(value, digits)}`;
  const rounded = Number(value.toPrecision(digits));
  const scale = ([ [1e15, "Q"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"] ] as const).find(([unit]) => Math.abs(rounded) >= unit);
  return `$${Number((value / (scale?.[0] ?? 1)).toPrecision(digits))}${scale?.[1] ?? ""}`;
}
export function acquisitionAxisTick(value: number, metric: AcquisitionMetric) {
  if (metric === "human-brain") return acquisitionNumber(value, metric, 2);
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
  return metric === "voxels-per-dollar" ? efficiency : (metric === "human-brain" ? HUMAN_IMAGE_VOXELS : 1) / efficiency;
}
export function acquisitionEfficiency(value: number, metric: AcquisitionMetric) {
  return acquisitionValue(value, metric);
}
export function acquisitionBenchmark(context: BrainBenchmarkContext, metric: AcquisitionMetric): BrainBenchmarkContext {
  return { ...context,
    disclosure: context.disclosure.replace(`${HUMAN_IMAGE_VOXELS.toLocaleString("en-US")} voxels`, "1.875×10²¹ voxels (~1.9 sextillion)")
      + (metric === "human-brain" ? ` ${ACQUISITION_HUMAN_COST_NOTE}` : ""),
    references: context.references.map(reference => ({
    ...reference, value: acquisitionValue(reference.value, metric),
    label: metric === "voxels-per-dollar" ? `${reference.label.split(" · ")[0]} · ${reference.value > 1e15 ? scientific(reference.value, 3) : compactCount(reference.value)}` : metric === "human-brain"
      ? reference.label.split(" · ")[0] : `${acquisitionNumber(reference.budget! / HUMAN_IMAGE_VOXELS, "dollars-per-voxel", 3)} per voxel`,
  })) };
}
export function acquisitionMetricPlot(source: DraftPlot, metric: AcquisitionMetric) {
  const axis = ACQUISITION_METRICS.find(option => option.id === metric)!.axis;
  const transformation = metric === "voxels-per-dollar" ? "efficiency" : `${metric === "human-brain" ? "1.875e21" : "1"} / efficiency`;
  const unit = metric === "voxels-per-dollar" ? "voxels/$" : metric === "human-brain" ? "$ per human brain" : "$ per voxel";
  const fitNote = `Fit diagnostics (equation, intercept, slope, R² and doubling time) retain original voxels/$ units. Display transformation: ${transformation}; selected y unit: ${unit}.`;
  return {
    ...source, title: `${ACQUISITION_CHART_TITLE} — ${ACQUISITION_METRICS.find(option => option.id === metric)!.label}`, yLabel: axis, previewYLabel: axis,
    acquisitionView: { metric, unit, transformation, fitBasis: "voxels/$", humanImageVoxels: HUMAN_IMAGE_VOXELS },
    points: source.points.map(point => ({ ...point, y: acquisitionValue(point.y, metric),
      exportAnnotation: metric === "voxels-per-dollar" ? point.exportAnnotation : point.exportAnnotation?.replace(/≈[^·]+vox\/\$/, `${point.qualifier ?? "≈"}${acquisitionNumber(acquisitionValue(point.y, metric), metric)} ${metric === "human-brain" ? "per human brain" : "per voxel"}`),
    })),
    referenceTrendlines: source.referenceTrendlines?.map(line => ({
      ...line, points: line.points.map(point => ({ ...point, y: acquisitionValue(point.y, metric) })),
      note: `${fitNote} ${line.note.replace("Descriptive fit, confined to observed years; no future projection or confidence interval.", "Descriptive historical fit; solid segment confined to observed years. Any dashed continuation is a separate extrapolation; no confidence interval.")}`,
      directLabel: metric === "voxels-per-dollar" ? line.directLabel : `${line.directLabel?.split(" · ")[0] ?? line.id} · cost halves every ${line.fit?.doublingYears?.toFixed(1)}y`,
      label: metric === "voxels-per-dollar" ? line.label : `${line.id === "em" ? "EM" : "Expansion"} fit · cost halves every ${line.fit?.doublingYears?.toFixed(1)}y`,
    })),
  };
}

/** Continue the existing unconstrained fit; never re-fit or extend the x domain. */
export function acquisitionBillionCrossing(line: DraftTrendline, xMax: number) {
  const fit = line.fit;
  if (!fit || fit.slopeLog10PerYear <= 0) return null;
  const year = fit.xOrigin + (Math.log10(HUMAN_IMAGE_VOXELS / 1e9) - fit.interceptLog10) / fit.slopeLog10PerYear;
  const start = fit.window[1], end = Math.min(year, xMax);
  return {
    id: line.id, color: line.color, year,
    label: `${line.id === "em" ? "EM" : "Expansion"} · $1B crossing ≈${year.toFixed(1)} · extrapolation${year > xMax ? " · beyond displayed range" : ""}`,
    points: end > start ? [start, end].map(x => ({ x, y: HUMAN_IMAGE_VOXELS / 10 ** (fit.interceptLog10 + fit.slopeLog10PerYear * (x - fit.xOrigin)) })) : [],
  };
}
