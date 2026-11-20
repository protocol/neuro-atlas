import type { DraftObservation } from "@/lib/draft-chart-types";

// Additional matched-denominator evidence; archived provider records stay immutable.
const tuszScope = "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.";
export const RECORDING_HOURS_COVERAGE: Record<string, NonNullable<DraftObservation["recordingCoverage"]>> = {
  "neuralink-reported-hours-2026-10-01": {
    count: null, unit: "participants",
    detail: "Recording contributors are not disclosed. Trial enrollment and the six participants in the performance analysis are not the denominator of >50,000 h. The first participant’s >9,000 h is a subset, not a per-person distribution.",
  },
  "tusz-scalp-eeg-2017-04-17": { count: 114, unit: "patients", sessions: 510, detail: tuszScope },
  "tusz-scalp-eeg-2017-08-04": { count: 246, unit: "patients", sessions: 686, detail: tuszScope },
  "tusz-scalp-eeg-2018-04-15": { count: 315, unit: "patients", sessions: 822, detail: tuszScope },
  "tusz-scalp-eeg-2018-08-16": { count: 364, unit: "patients", sessions: 970, detail: tuszScope },
  "tusz-scalp-eeg-2018-11-14": { count: 364, unit: "patients", sessions: 969, detail: tuszScope },
  "tusz-scalp-eeg-2019-07-22": { count: 692, unit: "patients", sessions: 1661, detail: tuszScope },
  "tusz-scalp-eeg-2020-04-23": { count: 692, unit: "patients", sessions: 1575, detail: tuszScope },
  "tusz-scalp-eeg-2020-05-09": { count: 692, unit: "patients", sessions: 2608, detail: tuszScope },
  "ajile12-intracranial-2022-01-27": {
    count: 12, unit: "participants",
    detail: "Frozen DANDI 000055/0.220127.0436 assetsSummary.numberOfSubjects = 12, matching its reported 1,280 h. The descriptor reports 3–5 recording days per participant and 55 semi-continuous days total; these are not exact session counts or quality-valid hour ranges.",
  },
  "poyo-primate-training-2023-10-24": {
    count: 7, unit: "nonhuman primates", sessions: 158, sessionsQualifier: ">",
    detail: "The paper’s >100 h training corpus spans seven nonhuman primates and >158 sessions. Existing recordings are reused; constituent access varies. Neither lower bound gives a typical session or a per-animal duration distribution.",
  },
  "japaneeg-scalp-eeg-2026-05-31": {
    count: 3, unit: "participants",
    durationSummary: "≈60–814 h per participant (calculated from Table 4)",
    detail: "Calculated from descriptor v2 Table 4 recording-hour cells: P01 ≈813.8 h, P02 ≈146.2 h, P03 ≈60.3 h. The shared covert-repetition/listening recordings are counted once. Rounded cells sum to 1,020.3 h versus Table 3’s 1,020.4 h; the plotted abstract total stays 1,020 h. These are accumulated per-person durations, not a continuous session or a publisher-reported range.",
  },
};

export const JAPANEEG_CURRENT_REFERENCES = [
  { role: "Current access and participant-duration evidence", title: "JapanEEG descriptor v2 · November 17, 2026 · Tables 3–4 and Data Records", url: "https://arxiv.org/html/2606.01264v2" },
  { role: "Author-reported controlled-access repository", title: "Harvard Dataverse · JapanEEG (files not inspected)", url: "https://doi.org/10.7910/DVN/5RM3OT" },
];

export const RECORDING_HOURS_REFERENCES: Record<string, NonNullable<DraftObservation["supportingReferences"]>> = {
  "japaneeg-scalp-eeg-2026-05-31": JAPANEEG_CURRENT_REFERENCES,
  "ajile12-intracranial-2022-01-27": [{ role: "Recording-day context (not QC-hour distribution)", title: "AJILE12 Scientific Data descriptor · 3–5 recording days per participant", url: "https://www.nature.com/articles/s41597-022-01280-y" }],
};
