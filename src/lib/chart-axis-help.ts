import type { DraftPlot } from "./draft-chart-types";

// Presentation only: preserve the source-reported value, metric and evaluation set.
// PATHFINDER v1, Table 1 and Methods → Segmentation evaluation:
// https://www.biorxiv.org/content/10.1101/2025.05.16.654254v1.full
const PATHFINDER_ERL = {
  label: "Normalized expected run length (%)",
  hover: "ERL stands for expected run length. The normalized score compares correctly traced axon lengths with an error-free reconstruction of the same reference sample. Higher is better.",
  explanation: "Higher scores mean longer correctly traced stretches of axon, with fewer breaks or false joins. 50% is half the ideal tracing-length score for this reference sample; 94.2% is close to ideal. 100% is possible: no tracing errors counted by the benchmark’s evaluation rules. Minor errors excluded by those rules may remain. This is a tracing-quality score, not the percentage of fully correct neurons.",
};

export function chartYAxisHelp(plot: Pick<DraftPlot, "id">) {
  return plot.id === "pathfinder-nerl" ? PATHFINDER_ERL : undefined;
}

export function chartAxesDescription(plot: Pick<DraftPlot, "id" | "xLabel" | "yLabel">) {
  const help = chartYAxisHelp(plot);
  return `x-axis: ${plot.xLabel} · y-axis: ${help?.label ?? plot.yLabel}${help ? `. ${help.explanation}` : ""}`;
}
