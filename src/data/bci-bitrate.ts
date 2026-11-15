import source from "./bci-bitrate.source.json";
import type { DraftChart } from "./draft-charts";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";
import { fitLogLinear } from "@/lib/log-linear-fit";

const groups: Record<string, { label: string; color: string; marker: DraftObservation["marker"] }> = {
  cursor: { label: "Cursor / grid control", color: "#1967d2", marker: "circle" },
  switch: { label: "Endovascular switch", color: "#9275ca", marker: "triangle" },
  speech: { label: "Speech decoding", color: "#cd732f", marker: "square" },
  handwriting: { label: "Handwriting decoding", color: "#647d3d", marker: "diamond" },
};

const points: DraftObservation[] = source.observations.map(point => {
  const group = groups[point.group];
  const native = point.nativeSource;
  const nativeRate = native?.rate
    ? ` Native result: ${native.rate.value} ${native.rate.unit}; ${native.rate.task}.${native.rate.error ? ` ${native.rate.error.value}% ${native.rate.error.metric.replaceAll("_", " ")}.` : ""}`
    : "";
  return {
    id: point.id,
    x: point.slideYear,
    y: point.approximateBps,
    qualifier: "≈",
    label: point.label,
    group: group.label,
    color: group.color,
    marker: group.marker,
    dateLabel: `${point.slideYear} · approximate slide position`,
    sourceUrl: native?.url,
    sourceTitle: native ? `Study context: ${native.title}` : "Unidentified reference-slide report · source unresolved",
    quote: native?.quote ?? "Cursor / Grid control",
    note: `Plotted value: approximately ${point.approximateBps} bits/s, digitized from the reference slide; it is not a source-reported study value.${native ? ` Study publication/disclosure: ${native.date} (${native.dateBasis}).${nativeRate} ${native.note}` : ` ${point.unresolvedNote}`}`,
    annotation: `${point.label} · ${point.slideYear} · ≈${point.approximateBps} bits/s`,
  };
});

export const BCI_BITRATE_FIT = fitLogLinear(points);

const fitNote = `Equal-weight ordinary least squares of log10(bits/s) against year across all ${BCI_BITRATE_FIT.n} approximate, photo-digitized observations, including repeated years. log10(rate) = ${BCI_BITRATE_FIT.interceptLog10.toFixed(6)} + ${BCI_BITRATE_FIT.slopeLog10PerX.toFixed(6)} × (year − ${BCI_BITRATE_FIT.xOrigin}); R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(2)}. Descriptive fit over the observed years only; heterogeneous tasks and unrecovered language-rate conversions limit interpretation. The original slide's model remains unavailable. No forecast or confidence band is shown.`;

const plot: DraftPlot = {
  id: "bci-bitrate",
  title: "BCI information transfer over time",
  xLabel: "Approximate year shown on slide",
  xKind: "year",
  yLabel: "Approximate slide rate (bits/s · log)",
  scale: "log",
  valueSignificantDigits: 2,
  observationBasis: "Digitized slide · approximate",
  scope: "Approximate reconstruction of the photographed Bitrate Scaling chart. All 14 plotted coordinates come from the slide; linked papers provide separate native metrics and study context. Four cursor reports remain unidentified.",
  seriesNote: "The original numeric dataset and WPM/CPM-to-bps conversion remain unverified. No new language-to-bitrate conversion is assumed. Source task definitions, vocabulary sizes, error measures and statistical summaries differ. The olive trendline is a descriptive equal-weight log-linear fit to all 14 approximate plotted observations. The original slide’s model remains unavailable. The shaded band and speech/typing benchmarks remain omitted because their derivations were not recovered.\n\nYears retain the slide’s placement. Stentrode was published online in 2020 with a 2021 journal issue; the independent-home-use speech result was posted as a preprint in July 2025 and published in Nature Medicine in June 2026. Card 2024’s source aggregate is 31.6 WPM with 2.5% WER; the slide labels it 33 WPM. The reason for that difference is unverified.",
  points,
  referenceTrendline: {
    label: `Log-linear fit · ${BCI_BITRATE_FIT.n} approximate points`,
    color: "#7e8152",
    note: fitNote,
    points: BCI_BITRATE_FIT.points,
  },
  exportPointKey: true,
  legend: Object.values(groups).map(group => ({ label: group.label, color: group.color, marker: group.marker })),
};

export const BCI_BITRATE_CHART: DraftChart = {
  category: "Human interfaces and recordings",
  title: plot.title,
  axes: "x-axis: approximate slide year · y-axis: approximate slide bitrate (bits/s), log scale",
  definition: "A 14-mark visual reconstruction of the reference slide, reconciled against identifiable study reports. Hover or select a mark for the source-native rate and evidence limits.",
  constraint: "Digitized values preserve an illustration’s approximate geometry. Task-specific cursor ITR, speech output and handwriting metrics have different definitions; the reconstruction does not establish a common performance benchmark or scaling law.",
};
export const BCI_BITRATE_EVIDENCE: DraftChartEvidence = {
  status: "plotted",
  summary: "Reference-slide reconstruction with separate primary-study evidence; every plotted value is approximate.",
  plots: [plot],
  gapReason: "The original 14-row dataset, exact language-to-bps conversions and four unlabeled cursor-study identities were not recovered. The source photograph is not redistributed; a reproducible coordinate-calibration ledger is retained with the chart source.",
};
