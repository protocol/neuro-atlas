import source from "./bci-bitrate.source.json";
import candidateLedger from "./bci-bitrate.candidates.json";
import type { DraftChart } from "./draft-charts";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";
import { fitLogLinear } from "@/lib/log-linear-fit";

const groups: Record<string, { label: string; color: string; marker: DraftObservation["marker"] }> = {
  cursor: { label: "Cursor / grid control", color: "#1967d2", marker: "circle" },
  switch: { label: "Endovascular switch", color: "#9275ca", marker: "triangle" },
  speech: { label: "Speech decoding", color: "#cd732f", marker: "square" },
  handwriting: { label: "Handwriting decoding", color: "#647d3d", marker: "diamond" },
};

// A declared Atlas illustration convention, not a value reported by these papers
// or a recovered equation from the original figure. No WER adjustment is applied.
export const BCI_SPEECH_BITS_PER_WORD = 5;
const handwritingReport = {
  url: "https://stacks.stanford.edu/file/druid:jx921pv3255/TechnicalReport01_GPT_BCIs-2021-05-20.pdf",
  title: "Authors' technical report · handwriting bitrate approximation",
  quote: "Bit rate approximated with an empirical conversion factor 16.06 (cwpm) / 2.6 (cwpm / bps) =∼6.18 (bps)",
};

type RateSelection = {
  basis: "paper" | "derived" | "company" | "image";
  basisLabel: string;
  bps: number;
  reportedResult?: string;
  calculation?: string;
};

const directRates: Record<string, RateSelection> = {
  "bci-slide-pandarinath": {
    basis: "paper", basisLabel: "Paper-reported", bps: 4.16,
    reportedResult: "4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days.",
  },
  "bci-slide-stentrode": {
    basis: "paper", basisLabel: "Paper-reported estimate", bps: 0.46,
    reportedResult: "0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; this is the authors' isolated-contribution estimate, not the hybrid 1.57-bits/s result.",
  },
  "bci-slide-neuralink": {
    basis: "company", basisLabel: "Company-reported", bps: 8,
    reportedResult: "8.0 bits/s achieved Webgrid performance, Neuralink's May 8, 2024 update; not a peer-reviewed paper.",
  },
};

export const BCI_BITRATE_ROWS = source.observations.map(point => {
  const nativeRate = point.nativeSource?.rate;
  let selected: RateSelection = directRates[point.id] ?? {
    basis: "image", basisLabel: "Image estimate", bps: point.approximateBps,
  };
  if (point.id === "bci-slide-handwriting") {
    selected = {
      basis: "derived", basisLabel: "Author estimate", bps: 16.06 / 2.6,
      reportedResult: "90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021.",
      calculation: "The authors' separate technical report models correction overhead and reports 16.06 correct words/minute ÷ 2.6 correct words/minute per bit/s ≈ 6.18 bits/s. Empirical approximation, not measured ITR; five characters/word and modeled backspace overhead.",
    };
  } else if (point.group === "speech" && nativeRate) {
    selected = {
      basis: "derived", basisLabel: "Atlas-calculated", bps: nativeRate.value * BCI_SPEECH_BITS_PER_WORD / 60,
      reportedResult: `${nativeRate.value} ${nativeRate.unit}; ${nativeRate.task}.${nativeRate.error ? ` ${nativeRate.error.value}% ${nativeRate.error.metric.replaceAll("_", " ")}.` : ""}`,
      calculation: `${nativeRate.value} words/minute × ${BCI_SPEECH_BITS_PER_WORD} assumed information bits/word ÷ 60 = ${Number((nativeRate.value * BCI_SPEECH_BITS_PER_WORD / 60).toPrecision(4))} bits/s. Atlas illustration assumption (one information bit/character × five characters/word), not source-reported neural ITR or a recovered original-chart formula. No error adjustment; the reported error metric remains separate. This is not an encoded-byte rate (one byte is eight bits).`,
    };
  }
  return { id: point.id, ...selected };
});

const candidates: Record<string, NonNullable<DraftObservation["candidateSources"]>> = candidateLedger;
const points: DraftObservation[] = source.observations.map(point => {
  const group = groups[point.group];
  const native = point.nativeSource;
  const selected = BCI_BITRATE_ROWS.find(row => row.id === point.id)!;
  const estimate = selected.basis === "image" || selected.basis === "derived" || point.id === "bci-slide-stentrode";
  const sourceContext = native ? ` Publication/disclosure: ${native.date} (${native.dateBasis}). ${native.note}` : ` ${point.unresolvedNote}`;
  const note = `${selected.basisLabel}. ${selected.reportedResult ? `Reported input: ${selected.reportedResult} ` : ""}${selected.calculation ?? (selected.basis === "image" ? "Plotted value digitized from the reference image; no numerical result verified for this exact mark." : "Plotted rate taken from the cited report; the chosen condition/statistic is explicit, not claimed to reproduce the original figure's exact selection.")} Reference image: approximately ${point.approximateBps} bits/s; original image coordinates remain archived separately.${sourceContext}`;
  return {
    id: point.id,
    x: point.slideYear,
    y: selected.bps,
    qualifier: estimate ? "≈" : undefined,
    label: point.label,
    group: group.label,
    color: group.color,
    marker: group.marker,
    dateLabel: `${point.slideYear} · reference-year placement; source date below`,
    sourceUrl: native?.url,
    sourceTitle: native ? `${selected.basis === "image" ? "Identified report; numerical value unresolved" : selected.basis === "derived" ? "Reported input" : selected.basisLabel}: ${native.title}` : "Anonymous reference-image mark · assignment unresolved",
    quote: native?.quote ?? "Cursor / Grid control",
    note,
    annotation: `${point.label} · ${point.slideYear} · ${estimate ? "≈" : ""}${Number(selected.bps.toPrecision(3))} bits/s · ${selected.basisLabel}`,
    exportNote: note,
    candidateSources: candidates[point.id],
    calculationSource: point.id === "bci-slide-handwriting" ? handwritingReport : selected.basis === "derived" ? {
      title: "Five-bits/word convention · independent ITR Atlas reference",
      url: "https://tangemicioglu.com/itr-atlas/methodology/",
    } : undefined,
  };
});

export const BCI_BITRATE_FIT = fitLogLinear(points);
const fitNote = `Equal-weight ordinary least squares of log10(bits/s) against reference year across all ${BCI_BITRATE_FIT.n} displayed observations: 2 paper-reported rates, 6 derived estimates, 1 company report and 5 image estimates. log10(rate) = ${BCI_BITRATE_FIT.interceptLog10.toFixed(6)} + ${BCI_BITRATE_FIT.slopeLog10PerX.toFixed(6)} × (year − ${BCI_BITRATE_FIT.xOrigin}); R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(2)}. Descriptive fit over observed years only; task definitions and conversion assumptions differ. Not a common performance benchmark, causal growth estimate, forecast or recovered original model. No confidence band is shown.`;

const plot: DraftPlot = {
  id: "bci-bitrate",
  title: "BCI information transfer over time",
  xLabel: "Year placement from reference figure",
  xKind: "year",
  yLabel: "Reported / estimated rate (bits/s · log)",
  scale: "log",
  valueSignificantDigits: 3,
  observationBasis: "Paper-reported · calculated · company · image estimate",
  scope: "14 reference observations: 2 paper-reported rates, 6 derived estimates from paper/preprint inputs, 1 company report and 5 image estimates. Every observation key states its evidence basis. The five image estimates are Kennedy plus four anonymous cursor marks; candidate sources are not confirmed assignments.",
  seriesNote: `Paper-reported: Pandarinath T5 9×9-grid mean 4.16 bits/s; Stentrode participant 2 isolated motor-neuroprosthesis estimate 0.46 bits/s. Company-reported: Neuralink 8.0 bits/s. These explicit selections replace the image-derived rates; they are not claimed to reproduce the original figure's chosen statistics.\n\nAtlas-calculated speech estimates use reported WPM × ${BCI_SPEECH_BITS_PER_WORD} assumed information bits/word ÷ 60, without error correction. One information bit/character and five characters/word are illustration assumptions, not measured entropy or encoded-byte size. Handwriting uses the authors' separate empirical approximation 16.06 correct WPM ÷ 2.6 ≈ 6.18 bits/s, not the speech formula. Reported inputs, errors and calculations are shown on inspection and in the data table. These are not measured neural information rates or a common cross-task benchmark.\n\nYears retain reference-figure placement. Stentrode's online publication is 2020 (2021 issue); home-use speech was posted as a preprint in July 2025 (final paper June 2026). Card 2024 uses the paper's 31.6-WPM aggregate, not the image's rounded 33-WPM label. Original numeric table, original conversion and confidence-band method remain unavailable. The olive line is fitted to the actual displayed values; no forecast, confidence band or speech/typing benchmark is shown.`,
  points,
  referenceTrendline: { label: `Log-linear fit · ${BCI_BITRATE_FIT.n} mixed-evidence points`, color: "#7e8152", note: fitNote, points: BCI_BITRATE_FIT.points },
  exportPointKey: true,
  legend: Object.values(groups).map(group => ({ label: group.label, color: group.color, marker: group.marker })),
};

export const BCI_BITRATE_CHART: DraftChart = {
  category: "Human interfaces and recordings",
  title: plot.title,
  axes: "x-axis: reference-figure year · y-axis: reported or estimated rate (bits/s), log scale",
  definition: "Fourteen reference observations with explicit paper-reported, calculated, company-reported or image-estimated provenance. Inspect a mark for its reported input, conversion and source limits.",
  constraint: "Text conversion assumptions and task-specific ITR are not equivalent measurements. This mixed-evidence illustration does not establish a common performance benchmark or scaling law.",
};
export const BCI_BITRATE_EVIDENCE: DraftChartEvidence = {
  status: "plotted",
  summary: "Per-point provenance: two paper-reported rates, six derived from paper/preprint inputs, one company report and five remaining image estimates.",
  plots: [plot],
  gapReason: "The original table/code and four anonymous-study assignments remain unavailable. Candidate papers are useful leads, not verified assignments; Kennedy's numerical result is unverified. All original image coordinates remain in the archived source ledger.",
};
