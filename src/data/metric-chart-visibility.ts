import { DRAFT_CHARTS, DRAFT_CHART_CATEGORIES, type DraftChart } from "./draft-charts";
import { DRAFT_CHART_EVIDENCE } from "./draft-chart-observations";
import type { DraftChartEvidence } from "@/lib/draft-chart-types";

/** Presentation retirement only. Original evidence and stable URL identities remain intact. */
export const RETIRED_METRIC_PLOT_IDS: ReadonlySet<string> = new Set([
  "gauss-section-rejection",
  "microns-section-loss",
  "precision-temporary-recording",
  "paired-auto",
  "comparative-specimens",
]);

export const METRIC_CHART_EVIDENCE: Record<string, DraftChartEvidence> = Object.fromEntries(
  Object.entries(DRAFT_CHART_EVIDENCE).map(([title, evidence]) => [title, {
    ...evidence,
    plots: evidence.plots.filter(plot => !RETIRED_METRIC_PLOT_IDS.has(plot.id)),
    ...(title === "Humans with implanted high-bandwidth BCIs over time" ? {
      summary: "Selected chronic intracortical research cohorts. Named program checkpoints are not additive or a current global installed base.",
    } : {}),
  }]),
);

export function isVisibleMetric(chart: DraftChart) {
  const evidence = METRIC_CHART_EVIDENCE[chart.title];
  return evidence.status === "plotted" && (evidence.plots.length > 0 || !!evidence.timeline);
}
export const METRIC_CHART_CATEGORIES = DRAFT_CHART_CATEGORIES.filter(category =>
  DRAFT_CHARTS.some(chart => chart.category === category && isVisibleMetric(chart)),
);

/** Retired section-quality URLs land in the remaining mapping category, not an empty card. */
export function metricCategoryFor(chart: DraftChart) {
  return METRIC_CHART_CATEGORIES.includes(chart.category) ? chart.category : "Mapping scale";
}
