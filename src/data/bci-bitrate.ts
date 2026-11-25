import source from "./bci-bitrate.source.json";
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

// Modality-specific PL R&D conversion models.
export const BCI_TEXT_ALPHABET_SIZE = 28;
export const BCI_TEXT_BITS_PER_CHARACTER = Math.log2(BCI_TEXT_ALPHABET_SIZE);
export const BCI_TEXT_CONVERSION = {
  basis: "equiprobable-alphabet",
  alphabetSize: BCI_TEXT_ALPHABET_SIZE,
  bitsPerCharacter: BCI_TEXT_BITS_PER_CHARACTER,
} as const;
export const BCI_SPEECH_BITS_PER_CHARACTER = 1;
export const BCI_SPEECH_CHARACTERS_PER_WORD = 5;
export const BCI_SPEECH_BITS_PER_WORD = BCI_SPEECH_CHARACTERS_PER_WORD * BCI_SPEECH_BITS_PER_CHARACTER;
export const BCI_SPEECH_CONVERSION = {
  basis: "english-entropy",
  bitsPerCharacter: BCI_SPEECH_BITS_PER_CHARACTER,
  charactersPerWord: BCI_SPEECH_CHARACTERS_PER_WORD,
  bitsPerWord: BCI_SPEECH_BITS_PER_WORD,
} as const;
export const BCI_SPEECH_CONVERSION_REFERENCE = {
  title: "Stanford · Entropy and Redundancy in English",
  url: "https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html",
} as const;

type RateSelection = {
  basis: "paper" | "derived" | "company" | "image";
  basisLabel: string;
  bps: number;
  reportedResult?: string;
  calculation?: string;
  calculationSource?: DraftObservation["calculationSource"];
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

// Source-native text inputs and selected evaluation conditions.
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
    reportedResult: "9.4 ± 3.2 correct characters/minute in the radial keyboard condition with completion off and ambiguous-key disambiguation retained. The completion-on condition reports 10.4 CPM.",
    calculation: "9.4 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Completion is off; ambiguous-key disambiguation remains.",
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
    nativeRateStatistic: "reported prediction-assisted timing; rounded summary: 2 letters/min",
    rateBasis: "timing-derived letter output",
    assistance: "prediction on; ECoG scanning",
    inputKey: "33 s/letter; timing output → log2(28)/33",
    task: "Prediction-assisted scanning ECoG brain-click spelling; 2D cursor control is a separate task",
    reportedResult: "33 seconds/letter with prediction assistance (= 60/33 characters/minute); the summary rounds this to two letters/minute.",
    calculation: "(60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance; WER/CER factors are omitted from the conversion.",
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
    nativeRateStatistic: "T6 mean; ±0.33 retains the source-reported uncertainty statistic",
    rateBasis: "correct text output; correction time included",
    assistance: "completion on; FlashSpeller scanning",
    inputKey: "6.88±0.33 correct CPM × log2(28)/60",
    task: "T6 FlashSpeller neural-switch scanning, free spelling with word completion",
    reportedResult: "6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning.",
    calculation: "6.88 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Word completion remains part of the task.",
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
    reportedResult: "0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; the hybrid result was 1.57 bits/s.",
  },
  "bci-slide-neuralink": {
    basis: "company", basisLabel: "Company-reported", bps: 8,
    nativeRateValue: 8, nativeRateUnit: "bits/s", task: "Neuralink PRIME Webgrid achievement",
    nativeRateStatistic: "company-reported achieved rate",
    reportedResult: "8.0 bits/s achieved Webgrid performance, reported in Neuralink's May 8, 2024 company update.",
  },
};

export const BCI_BITRATE_ROWS = source.observations.map(point => {
  const nativeRate = point.nativeSource?.rate;
  let selected: RateSelection = selectedText[point.id] ?? directRates[point.id] ?? {
    basis: "image", basisLabel: "Unverified estimate", bps: point.approximateBps,
    reportedResult: `Approximately ${point.approximateBps} bits/s; source-native numerical rate unverified.`,
    calculation: "Approximate visual rate; source-native numerical rate unverified.",
    task: "Cursor control; numerical rate unverified",
  };
  if (point.id === "bci-slide-handwriting") {
    selected = {
      basis: "derived", basisLabel: "PL R&D estimate", bps: 90 * BCI_TEXT_BITS_PER_CHARACTER / 60,
      assistance: "no LM postprocessing",
      inputKey: "90 gross CPM × log2(28)/60; 5.4% CER",
      reportedResult: "90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021.",
      calculation: "90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace. The conversion retains the gross rate; 5.4% CER is reported separately.",
    };
  } else if (point.group === "speech" && nativeRate) {
    selected = {
      basis: "derived", basisLabel: "PL R&D estimate", bps: nativeRate.value * BCI_SPEECH_BITS_PER_WORD / 60,
      assistance: "LM-assisted",
      calculationSource: BCI_SPEECH_CONVERSION_REFERENCE,
      inputKey: `${nativeRate.value} gross WPM × 5 × 1 bit/char /60; ${nativeRate.error ? `${nativeRate.error.value}% WER` : "WER unpaired"}`,
      reportedResult: `${nativeRate.value} ${nativeRate.unit}; ${nativeRate.task}.${nativeRate.error ? ` ${nativeRate.error.value}% ${nativeRate.error.metric.replace(/_pct$/, "").replaceAll("_", " ")}.` : ""}`,
      calculation: `${nativeRate.value} words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately.`,
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
    rateBasis: selected.rateBasis ?? (selected.basis === "derived" ? "gross decoding pace" : selected.basis === "image" ? "approximate rate; source unverified" : "native task-bps"),
    task: selected.task ?? nativeRate?.task ?? "Native task rate",
    calculation: selected.calculation ?? "Native task bits/s retained under the source’s task-specific definition.",
    fitIncluded: selected.basis === "derived",
  };
});

export const BCI_BITRATE_CONTEXT_COUNT = BCI_BITRATE_ROWS.filter(row => !row.fitIncluded).length;

// Display factual caveats separately; archival native notes also contain historical
// research instructions and must not become current reader-facing copy.
const readerCaveats: Record<string, string> = {
  "bci-slide-kennedy-bakay": "The paper is identified from its metadata and abstract; its full numerical result remains unverified. The dot retains the approximate visual rate.",
  "bci-slide-pandarinath": "The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart uses the 9×9 mean; 4.36 bits/s describes one example block.",
  "bci-slide-neuralink": "Neuralink reports this result in its company disclosure; independent validation remains unverified.",
  "bci-slide-stentrode": "The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s.",
  "bci-slide-handwriting": "The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The 90-CPM gross pace is converted by PL R&D without a CER penalty.",
  "bci-slide-moses": "Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation; the conversion uses the reported WPM median.",
  "bci-slide-willett-speech": "The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences.",
  "bci-slide-metzger": "Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance.",
  "bci-slide-card-2024": "31.6 WPM and 2.5% WER are the final five copy-task session means.",
  "bci-slide-card-home": "WER paired with personal home use is unspecified here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024.",
};
const points: DraftObservation[] = source.observations.map(point => {
  const selection = selectedText[point.id];
  const group = groups[selection?.group ?? point.group];
  const native = selection?.source ?? point.nativeSource;
  const selected = BCI_BITRATE_ROWS.find(row => row.id === point.id)!;
  const label = selection?.label ?? (!native ? `${point.label.replace("Unlabeled cursor report", "Cursor control")} · source unverified` : point.label);
  const estimate = selected.basis === "image" || selected.basis === "derived" || point.id === "bci-slide-stentrode";
  const sourceContext = native ? ` Publication/disclosure: ${native.date} (${native.dateBasis.replace(", not DOI date string", "")}). ${readerCaveats[point.id] ?? ""}` : "";
  const note = selected.basis === "image"
    ? `${selected.basisLabel}. Approximately ${selected.bps} bits/s; source-native numerical rate unverified. The dot retains the approximate visual rate.${!native ? " Source and publication year are unverified." : sourceContext}`
    : `${selected.basisLabel}. ${selected.reportedResult ? `Reported input: ${selected.reportedResult} ` : ""}${selected.calculation ?? "Native task bits/s from the cited report; condition and statistic shown above."}${sourceContext}`;
  const fitStatus = selected.fitIncluded ? " Text-equivalent; fit included." : " Context; excluded from fit.";
  const exportLabel = label.replaceAll(" et al.", "").replace("Cursor control A · source unverified", "Cursor A").replace("Synchron ", "").replace("Card & Stavisky", "Card");
  return {
    id: point.id,
    x: point.slideYear,
    y: selected.bps,
    qualifier: estimate ? "≈" : undefined,
    label,
    group: group.label,
    color: group.color,
    marker: group.marker,
    dateLabel: native ? `${point.slideYear} · publication/disclosure year; source date below` : `${point.slideYear} · year unverified`,
    sourceUrl: native?.url,
    sourceTitle: native ? `${selected.basis === "image" ? "Identified report; numerical rate unverified" : selected.basis === "derived" ? "Reported input" : selected.basisLabel}: ${native.title}` : "Source-native numerical rate unverified",
    quote: native?.quote ?? "Cursor / Grid control",
    note: note + fitStatus,
    annotation: `${label}${point.id === "bci-slide-pandarinath" ? " · T5 9×9 grid" : point.id === "bci-slide-stentrode" ? " · P2 isolated" : ""} · ${point.slideYear} · ${estimate ? "≈" : ""}${Number(selected.bps.toPrecision(3))} bits/s${selected.fitIncluded ? " text-equivalent" : ""} · ${selected.basisLabel}${selected.fitIncluded ? ` · ${selected.inputKey} · ${selected.assistance} · fit included` : " · context · excluded from fit"}`,
    exportAnnotation: `${exportLabel}${point.id === "bci-slide-pandarinath" ? " T5 9×9" : point.id === "bci-slide-stentrode" ? " P2 isolated" : ""} · ${point.slideYear} · ${estimate ? "≈" : ""}${Number(selected.bps.toPrecision(3))} ${selected.fitIncluded ? `${point.group === "speech" ? "1b/char " : ""}equiv.` : selected.basis === "image" ? "source unverified" : selected.basis === "company" ? "company" : point.id === "bci-slide-stentrode" ? "native est." : "native"}`,
    exportNote: note + fitStatus,
    calculationSource: selected.calculationSource,
  };
});

// Fit the same nine text observations under their declared modality-specific models.
// Native task-bps and source-unverified approximate rates stay excluded.
export const BCI_BITRATE_FIT = fitLogLinear(points.filter(point => BCI_BITRATE_ROWS.find(row => row.id === point.id)!.fitIncluded));
const fitNote = `Equal-weight ordinary least squares of log10(text-equivalent bits/s) against year across ${BCI_BITRATE_FIT.n} converted-text observations; ${BCI_BITRATE_CONTEXT_COUNT} context marks are excluded (3 native task-bps, 2 approximate rates with unverified numerical sources). log10(rate) = ${BCI_BITRATE_FIT.interceptLog10.toFixed(6)} + ${BCI_BITRATE_FIT.slopeLog10PerX.toFixed(6)} × (year − ${BCI_BITRATE_FIT.xOrigin}); R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(6)}. Mixed-convention descriptive fit over 2015–2025: five speech estimates use 1 assumed bit/character × 5 assumed characters/word; handwriting and three text-selection/scanning estimates use log2(28) bits/character. Tasks, assistance, errors and summary statistics differ. The fit summarizes heterogeneous model-derived text-output rates across the observed years; the line is shown without a confidence band.`;

const plot: DraftPlot = {
  id: "bci-bitrate",
  title: "BCI communication rates over time",
  xLabel: "Year",
  xKind: "year",
  yearTickStep: 5,
  yLabel: "Text-equivalent / native-task context (bits/s · log)",
  scale: "log",
  valueSignificantDigits: 3,
  observationBasis: "Paper-reported · calculated · company · source-unverified approximate rate",
  scope: "14 displayed observations: 9 PL R&D text-equivalent estimates included in the fit; 5 context marks excluded (2 paper-reported native task rates, 1 company native task rate and 2 approximate rates with unverified numerical sources).",
  seriesNote: "Speech: PL R&D estimates use 1 assumed bit/character × five characters per word, including spaces (5 assumed bits/word). This context-dependent English-entropy model follows Stanford’s ‘Entropy and Redundancy in English,’ which describes estimates around 1 bit/letter. The selected weight and word-length factor are assumptions for these speech corpora. WPM × 5 × 1/60.\n\nHandwriting and text selection/scanning use an equiprobable 28-symbol modeling alphabet: 26 letters, a space and one extra symbol define the chosen modeling alphabet; task keyboards vary. log2(28) ≈ 4.8 assumed bits/character is an ideal finite-codebook equivalent. Measured English entropy and 8-bit storage use different definitions (a literal fixed-width 28-symbol code needs 5 bits). This normalization convention uses CPM × log2(28)/60 or log2(28)/seconds-per-letter. Calculations use full precision.\n\nNative correct-character rates already include correction time. Speech and handwriting conversions retain gross pace, with WER/CER reported separately. Vansteensel uses the reported 33 seconds/letter timing. Assistance and tasks differ: dictionary disambiguation, prediction, completion and language models can contribute to output. The estimates describe task output under these different forms of assistance. Correlations and language-model contributions remain part of the assisted output; each estimate retains its task’s error metric and summary statistic.\n\nThe mixed-convention descriptive fit includes 9 text-equivalent observations; 5 context marks are excluded: 3 native task/company bits/s rates and 2 approximate rates with unverified numerical sources. Years indicate publication, preprint, journal issue or company disclosure; source dates are shown per observation. Bacher uses the 2015 issue (online 2014); Stentrode the 2021 issue (online 2020); home speech the 2025 preprint (final paper 2026). The 2015 cursor-control point has an unverified source and year.",
  points,
  referenceTrendline: { label: `Log-linear fit · ${BCI_BITRATE_FIT.n} text-equivalent points · mixed models · R²(log10) = ${BCI_BITRATE_FIT.rSquaredLog10?.toFixed(3)}`, color: "#7e8152", note: fitNote, methodologyUrl: "https://github.com/protocol/neuro-atlas/blob/845e4a614c5209dd045f2accba1f71709d118006/docs/bci-bitrate.md", points: BCI_BITRATE_FIT.points },
  exportPointKey: true,
  exportPointKeyNote: "Study key · years · bits/s. PL R&D estimates: speech 1 bit/char × 5 char/word; other text 28-symbol. Mixed-model fit; context outside the fit.",
  legend: Object.values(groups).map(group => ({ label: group.label, color: group.color, marker: group.marker })),
};

export const BCI_BITRATE_CHART: DraftChart = {
  category: "Human interfaces and recordings",
  title: plot.title,
  axes: "x-axis: year · y-axis: text-equivalent / native-task context (bits/s), log scale",
  definition: "Fourteen displayed observations: five speech estimates at 1 assumed bit/character × 5 assumed characters/word, four handwriting/text-selection estimates at log2(28) bits/character, and five excluded context marks. All nine converted values are PL R&D estimates.",
  constraint: "The mixed-convention fit summarizes nine selected text-output estimates with distinct tasks, errors, assistance and summary statistics. Native task rates and approximate rates with unverified numerical sources appear as context outside the fit.",
};
export const BCI_BITRATE_EVIDENCE: DraftChartEvidence = {
  status: "plotted",
  summary: "14 displayed marks: 9 PL R&D text-equivalent estimates in the fit, 3 native task/company bitrates and 2 approximate rates with unverified numerical sources as excluded context.",
  plots: [plot],
};
