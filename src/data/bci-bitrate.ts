import source from "./bci-bitrate.source.json";
import candidateLedger from "./bci-bitrate.candidates.json";
import type { DraftChart } from "./draft-charts";
import type { DraftChartEvidence, DraftObservation, DraftPlot } from "@/lib/draft-chart-types";
import { fitLogLinear } from "@/lib/log-linear-fit";

const groups: Record<string, { label: string; color: string; marker: DraftObservation["marker"] }> = {
  cursor: { label: "Cursor / grid control", color: "#1967d2", marker: "circle" },
  switch: { label: "Endovascular switch", color: "#9275ca", marker: "triangle" },
  text: { label: "Text selection / scanning", color: "#367d83", marker: "triangle" },
  speech: { label: "Speech decoding", color: "#cd732f", marker: "square" },
  handwriting: { label: "Handwriting decoding", color: "#647d3d", marker: "diamond" },
};

// PL R&D normalization convention, not a recovered original-figure formula.
export const BCI_TEXT_ALPHABET_SIZE = 28;
export const BCI_TEXT_BITS_PER_CHARACTER = Math.log2(BCI_TEXT_ALPHABET_SIZE);
export const BCI_TEXT_CHARACTERS_PER_WORD = 5;
export const BCI_SPEECH_BITS_PER_WORD = BCI_TEXT_CHARACTERS_PER_WORD * BCI_TEXT_BITS_PER_CHARACTER;
export const BCI_TEXT_CONVERSION = {
  alphabetSize: BCI_TEXT_ALPHABET_SIZE,
  bitsPerCharacter: BCI_TEXT_BITS_PER_CHARACTER,
  charactersPerWord: BCI_TEXT_CHARACTERS_PER_WORD,
  bitsPerWord: BCI_SPEECH_BITS_PER_WORD,
} as const;

type RateSelection = {
  basis: "paper" | "derived" | "company" | "image";
  basisLabel: string;
  bps: number;
  reportedResult?: string;
  calculation?: string;
  nativeRateValue?: number;
  nativeRateUnit?: string;
  task?: string;
  nativeRateStatistic?: string;
  rateBasis?: string;
  assistance?: string;
  inputKey?: string;
};

type SelectedTextObservation = RateSelection & {
  label: string;
  group: string;
  source: { url: string; title: string; date: string; dateBasis: string; quote: string };
};

// Explicit selections for our chart, not identifications of the original author's dots.
// The original coordinates and candidate assignments remain untouched in the archives.
const selectedText: Record<string, SelectedTextObservation> = {
  "bci-slide-unlabeled-cursor-2015-lower": {
    label: "Bacher et al.", group: "text", basis: "derived", basisLabel: "PL R&D estimate",
    bps: 9.4 * BCI_TEXT_BITS_PER_CHARACTER / 60,
    nativeRateValue: 9.4, nativeRateUnit: "correct characters/minute",
    nativeRateStatistic: "S3 radial keyboard mean ± SD, 9.4 ± 3.2 correct CPM",
    rateBasis: "correct text output; correction time included",
    assistance: "completion off; dictionary disambiguation",
    inputKey: "9.4±3.2 correct CPM × log2(28)/60",
    task: "Radial keyboard text entry, completion off; ambiguous-key disambiguation retained",
    reportedResult: "9.4 ± 3.2 correct characters/minute; radial ‘keyboard ’ condition, completion off; ambiguous-key disambiguation retained (not the 10.4-CPM completion condition).",
    calculation: "9.4 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Completion is off; ambiguous-key disambiguation remains.",
    source: {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3",
      title: "Neural point-and-click communication by a person with incomplete locked-in syndrome",
      date: "2014-11-10", dateBasis: "first online publication; 2015 journal issue",
      quote: "In the “keyboard” task, the number of keystrokes per minute (QWERTY: 7.1 ± 1.7, Radial: 12.3 ± 1.1 kspm, p < 0.001) and the number of correct characters per minute (QWERTY: 5.7 ± 2.0, Radial: 9.4 ± 3.2 ccpm, p = 0.019) were higher using the Radial Keyboard compared to the QWERTY keyboard.",
    },
  },
  "bci-slide-unlabeled-cursor-2016": {
    label: "Vansteensel et al.", group: "text", basis: "derived", basisLabel: "PL R&D estimate",
    bps: BCI_TEXT_BITS_PER_CHARACTER / 33,
    nativeRateValue: 33, nativeRateUnit: "seconds/letter",
    nativeRateStatistic: "reported prediction-assisted timing, not rounded 2 letters/min",
    rateBasis: "timing-derived letter output; not native correct CPM",
    assistance: "prediction on; ECoG scanning",
    inputKey: "33 s/letter; timing output → log2(28)/33",
    task: "Scanning ECoG brain-click spelling, prediction assisted (not 2D cursor control)",
    reportedResult: "33 seconds/letter with prediction assistance (= 60/33 characters/minute), rather than the rounded two letters/minute summary.",
    calculation: "(60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance. No error penalty; no extra WER/CER factor.",
    source: {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/",
      title: "Fully Implanted Brain–Computer Interface in a Locked-In Patient with ALS",
      date: "2016-11-12", dateBasis: "first online publication",
      quote: "Spelling initially took 52 seconds per letter; the time required dropped to 33 seconds per letter when word prediction was used.",
    },
  },
  "bci-slide-unlabeled-cursor-2018": {
    label: "Milekovic / Sarma et al.", group: "text", basis: "derived", basisLabel: "PL R&D estimate",
    bps: 6.88 * BCI_TEXT_BITS_PER_CHARACTER / 60,
    nativeRateValue: 6.88, nativeRateUnit: "correct characters/minute",
    nativeRateStatistic: "T6 mean; ±0.33 as reported, not recast as a CI",
    rateBasis: "correct text output; correction time included",
    assistance: "completion on; FlashSpeller scanning",
    inputKey: "6.88±0.33 correct CPM × log2(28)/60",
    task: "T6 FlashSpeller neural-switch scanning, free spelling with word completion",
    reportedResult: "6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning.",
    calculation: "6.88 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Word completion remains part of the task.",
    source: {
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008",
      title: "Stable long-term BCI-enabled communication in ALS and locked-in syndrome using LFP signals",
      date: "2018-04-25", dateBasis: "first online publication",
      quote: "The average spelling performance, as measured by the number of correct characters per minute (CCPM), during free-spelling blocks using word completion was 3.07 ± 0.20 CCPM and 6.88 ± 0.33 CCPM for T2 and T6, respectively.",
    },
  },
};

const directRates: Record<string, RateSelection> = {
  "bci-slide-pandarinath": {
    basis: "paper", basisLabel: "Paper-reported", bps: 4.16,
    reportedResult: "4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days.",
    nativeRateValue: 4.16, nativeRateUnit: "bits/s", task: "T5 9×9 grid selection",
    nativeRateStatistic: "mean across eight blocks/two days",
  },
  "bci-slide-stentrode": {
    basis: "paper", basisLabel: "Paper-reported estimate", bps: 0.46,
    nativeRateValue: 0.46, nativeRateUnit: "bits/s", task: "P2 isolated motor-neuroprosthesis contribution; actual typing also used eye tracking",
    nativeRateStatistic: "participant 2 mean author estimate",
    reportedResult: "0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; this is the authors' isolated-contribution estimate, not the hybrid 1.57-bits/s result.",
  },
  "bci-slide-neuralink": {
    basis: "company", basisLabel: "Company-reported", bps: 8,
    nativeRateValue: 8, nativeRateUnit: "bits/s", task: "Neuralink PRIME Webgrid achievement",
    nativeRateStatistic: "company-reported achieved rate",
    reportedResult: "8.0 bits/s achieved Webgrid performance, Neuralink's May 8, 2024 update; not a peer-reviewed paper.",
  },
};

export const BCI_BITRATE_ROWS = source.observations.map(point => {
  const nativeRate = point.nativeSource?.rate;
  let selected: RateSelection = selectedText[point.id] ?? directRates[point.id] ?? {
    basis: "image", basisLabel: "Image estimate", bps: point.approximateBps,
    reportedResult: `Approximately ${point.approximateBps} bits/s from the reference image; native numeric result unresolved.`,
    calculation: "Image digitization only; no text conversion or verified source-native rate.",
    task: "Reference-image context; native numeric source unresolved",
  };
  if (point.id === "bci-slide-handwriting") {
    selected = {
      basis: "derived", basisLabel: "PL R&D estimate", bps: 90 * BCI_TEXT_BITS_PER_CHARACTER / 60,
      assistance: "no LM postprocessing",
      inputKey: "90 gross CPM × log2(28)/60; 5.4% CER",
      reportedResult: "90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021.",
      calculation: "90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace, not measured neural ITR. No error penalty; 5.4% CER remains separate.",
    };
  } else if (point.group === "speech" && nativeRate) {
    selected = {
      basis: "derived", basisLabel: "PL R&D estimate", bps: nativeRate.value * BCI_SPEECH_BITS_PER_WORD / 60,
      assistance: "LM-assisted",
      inputKey: `${nativeRate.value} gross WPM × 5 × log2(28)/60; ${nativeRate.error ? `${nativeRate.error.value}% WER` : "WER unpaired"}`,
      reportedResult: `${nativeRate.value} ${nativeRate.unit}; ${nativeRate.task}.${nativeRate.error ? ` ${nativeRate.error.value}% ${nativeRate.error.metric.replace(/_pct$/, "").replaceAll("_", " ")}.` : ""}`,
      calculation: `${nativeRate.value} words/minute × 5 assumed characters/word × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace, not measured neural ITR. No error penalty; the reported error metric remains separate.`,
    };
  }
  const native = selectedText[point.id]?.source ?? point.nativeSource;
  return {
    id: point.id, ...selected,
    referenceYear: point.slideYear,
    label: selectedText[point.id]?.label ?? point.label,
    sourceUrl: native?.url, sourceTitle: native?.title,
    sourceDate: native?.date, sourceDateBasis: native?.dateBasis,
    nativeRateValue: selected.nativeRateValue ?? nativeRate?.value,
    nativeRateUnit: selected.nativeRateUnit ?? nativeRate?.unit,
    nativeRateStatistic: selected.nativeRateStatistic ?? nativeRate?.statistic,
    nativeError: nativeRate?.error ?? null,
    rateBasis: selected.rateBasis ?? (selected.basis === "derived" ? "gross decoding pace" : selected.basis === "image" ? "unresolved image estimate" : "native task-bps"),
    task: selected.task ?? nativeRate?.task ?? "Native task rate",
    calculation: selected.calculation ?? "Native task bits/s retained as reported; not converted using the text convention.",
    fitIncluded: selected.basis === "derived",
  };
});

export const BCI_BITRATE_CONTEXT_COUNT = BCI_BITRATE_ROWS.filter(row => !row.fitIncluded).length;

// Display factual caveats separately; archival native notes also contain historical
// research instructions and must not become current reader-facing copy.
const readerCaveats: Record<string, string> = {
  "bci-slide-kennedy-bakay": "The paper is identified at metadata/abstract level; its full numerical result is unverified. No typing-rate conversion is used for this dot.",
  "bci-slide-pandarinath": "The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart explicitly selects the 9×9 mean, not the single 4.36-bits/s example block; the original figure's exact choice is unknown.",
  "bci-slide-neuralink": "This is a company disclosure, not independent validation. The original figure's exact value/date/grid pairing is unknown.",
  "bci-slide-stentrode": "The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s.",
  "bci-slide-handwriting": "The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The selected 90-CPM gross pace is converted by PL R&D without a CER penalty; no author corrected-typing model is used.",
  "bci-slide-moses": "Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation, not a per-trial channel estimate.",
  "bci-slide-willett-speech": "The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences, not free conversation.",
  "bci-slide-metzger": "Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance.",
  "bci-slide-card-2024": "31.6 WPM and 2.5% WER are the final five copy-task session means. The reference figure's 33-WPM label is a different, unverified selection.",
  "bci-slide-card-home": "Personal home use has no paired WER here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024, not an independent cohort.",
};
const candidates: Record<string, NonNullable<DraftObservation["candidateSources"]>> = candidateLedger;
const points: DraftObservation[] = source.observations.map(point => {
  const selection = selectedText[point.id];
  const group = groups[selection?.group ?? point.group];
  const native = selection?.source ?? point.nativeSource;
  const label = selection?.label ?? (candidates[point.id] ? `${point.label.replace("Unlabeled cursor report", "Cursor control")} · source unconfirmed` : point.label);
  const selected = BCI_BITRATE_ROWS.find(row => row.id === point.id)!;
  const estimate = selected.basis === "image" || selected.basis === "derived" || point.id === "bci-slide-stentrode";
  const selectionNote = selection ? " Explicitly selected paper-backed observation for this chart, not a confirmed assignment of the original author's dot." : "";
  const sourceContext = native ? ` Publication/disclosure: ${native.date} (${native.dateBasis}). ${readerCaveats[point.id] ?? ""}` : "";
  const note = !native
    ? `${selected.basisLabel}. Approximately ${point.approximateBps} bits/s, digitized from the reference. The papers below are plausible candidates, not confirmed assignments; this dot has not been replaced by a converted candidate result.`
    : `${selected.basisLabel}. ${selected.reportedResult ? `Reported input: ${selected.reportedResult} ` : ""}${selected.calculation ?? (selected.basis === "image" ? "Plotted value digitized from the reference image; no numerical result verified for this exact mark." : "Plotted rate taken from the cited report; the chosen condition/statistic is explicit, not claimed to reproduce the original figure's exact selection.")} Reference image: approximately ${point.approximateBps} bits/s; original image coordinates remain archived separately.${sourceContext}${selectionNote}`;
  const fitStatus = selected.fitIncluded ? " Text-equivalent; fit included." : " Context; excluded from fit.";
  return {
    id: point.id,
    x: point.slideYear,
    y: selected.bps,
    qualifier: estimate ? "≈" : undefined,
    label,
    group: group.label,
    color: group.color,
    marker: group.marker,
    dateLabel: `${point.slideYear} · reference-year placement; source date below`,
    sourceUrl: native?.url,
    sourceTitle: native ? `${selected.basis === "image" ? "Identified report; numerical value unresolved" : selected.basis === "derived" ? "Reported input" : selected.basisLabel}: ${native.title}` : "Anonymous reference-image mark · assignment unresolved",
    quote: native?.quote ?? "Cursor / Grid control",
    note: note + fitStatus,
    annotation: `${label}${point.id === "bci-slide-pandarinath" ? " · T5 9×9 grid" : point.id === "bci-slide-stentrode" ? " · P2 isolated" : ""} · ${point.slideYear} · ${estimate ? "≈" : ""}${Number(selected.bps.toPrecision(3))} bits/s${selected.fitIncluded ? " text-equivalent" : ""} · ${selected.basisLabel}${selected.fitIncluded ? ` · ${selected.inputKey} · ${selected.assistance} · fit included` : " · context · excluded from fit"}`,
    exportNote: note + fitStatus,
    candidateSources: selection ? undefined : candidates[point.id],
    calculationSource: undefined,
  };
});

// Implementation choice: fit the uniformly converted text subset only, not native
// task-bps or unresolved image context. This supersedes the historical 14-mark fit.
export const BCI_BITRATE_FIT = fitLogLinear(points.filter(point => BCI_BITRATE_ROWS.find(row => row.id === point.id)!.fitIncluded));
const fitNote = `Equal-weight ordinary least squares of log10(text-equivalent bits/s) against reference year across ${BCI_BITRATE_FIT.n} converted-text observations; ${BCI_BITRATE_CONTEXT_COUNT} context marks are excluded (3 native task-bps, 2 unresolved image estimates). log10(rate) = ${BCI_BITRATE_FIT.interceptLog10.toFixed(6)} + ${BCI_BITRATE_FIT.slopeLog10PerX.toFixed(6)} × (year − ${BCI_BITRATE_FIT.xOrigin}); R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(6)}. Descriptive subset fit over 2015–2025 only; assistance, error metrics and tasks differ. Not a common performance benchmark, measured neural ITR, causal growth estimate or forecast. No confidence band is shown.`;

const plot: DraftPlot = {
  id: "bci-bitrate",
  title: "BCI communication rates over time",
  xLabel: "Year placement from reference figure",
  xKind: "year",
  yearTickStep: 5,
  yLabel: "Text-equivalent / native-task context (bits/s · log)",
  scale: "log",
  valueSignificantDigits: 3,
  observationBasis: "Paper-reported · calculated · company · image estimate",
  scope: "14 displayed observations: 9 PL R&D text-equivalent estimates included in the fit; 5 context marks excluded (2 paper-reported native task rates, 1 company native task rate and 2 unresolved image estimates).",
  seriesNote: "PL R&D text-equivalent estimates use an equiprobable 28-symbol modeling alphabet: 26 letters, a space and one extra symbol are our declared choice, not the actual task keyboard. log2(28) ≈ 4.8 assumed bits/character is an ideal finite-codebook equivalent, not measured English entropy or 8-bit storage (a literal fixed-width 28-symbol code needs 5 bits). Speech assumes five characters per word, including spaces: a normalization convention, not measured corpus word length. CPM × log2(28)/60; WPM × 5 × log2(28)/60. Calculations use full precision.\n\nNo extra WER/CER penalty: native correct-character rates already include correction time; the gross pace of speech and handwriting keeps reported errors separate. Vansteensel uses the reported 33 seconds/letter timing, not native correct CPM. Assistance and tasks differ: dictionary disambiguation, prediction, completion and language models can contribute to output. Correlations and language-model output mean these are not measured neural information rates, error-standardized results or a common performance benchmark.\n\nOnly 9 text-equivalent observations enter the fit; 5 context marks are excluded: 3 native task/company bits/s rates (unchanged) and 2 unresolved image estimates. All 14 marks retain reference-year placement. Bacher uses the 2015 issue (online 2014); Stentrode the 2021 issue (online 2020); home speech the 2025 preprint (final paper 2026). Named Bacher, Vansteensel and Milekovic/Sarma results are selections for our chart, not recovered original-dot assignments. Original image coordinates and historical candidate leads remain archived.",
  points,
  referenceTrendline: { label: `Log-linear fit · ${BCI_BITRATE_FIT.n} text-equivalent points · R²(log10) = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(3)}`, color: "#7e8152", note: fitNote, methodologyUrl: "https://github.com/protocol/neuro-atlas/blob/8c4b036f3faa70844e20d0acb20e8c1adeee203b/docs/bci-bitrate.md", points: BCI_BITRATE_FIT.points },
  exportPointKey: true,
  legend: Object.values(groups).map(group => ({ label: group.label, color: group.color, marker: group.marker })),
};

export const BCI_BITRATE_CHART: DraftChart = {
  category: "Human interfaces and recordings",
  title: plot.title,
  axes: "x-axis: reference-figure year · y-axis: text-equivalent / native-task context (bits/s), log scale",
  definition: "Fourteen displayed observations: nine PL R&D text-equivalent estimates using log2(28) bits/character and five excluded context marks. Inspect native rates, assistance, conversion and source limits.",
  constraint: "Uniform text conversion does not standardize tasks, errors or assistance. Native task rates and unresolved image values are context only; this is not measured neural ITR, a common benchmark or a scaling law.",
};
export const BCI_BITRATE_EVIDENCE: DraftChartEvidence = {
  status: "plotted",
  summary: "14 displayed marks: 9 PL R&D text-equivalent estimates in the fit, 3 native task/company bitrates and 2 unresolved image estimates as excluded context.",
  plots: [plot],
  gapReason: "Original table/code and anonymous-dot assignments remain unavailable. Three named paper-backed text observations are explicitly selected for this chart. Kennedy's numeric result and the upper-2015 source/value remain unresolved context; the latter retains candidate links. Original image coordinates and candidate assignments remain archived separately.",
};
