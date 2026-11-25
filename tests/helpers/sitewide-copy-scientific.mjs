import assert from 'node:assert/strict';
// Exact runtime leaf-string consequences of the reviewed 2026-11-25 source
// delta. Captured by evaluating restoreMerged151Copy source, never by rehashing
// historical goldens. No arrays, numbers, source URLs or quotations are replaced.
const delta = {
  "draft": [
    {
      "path": [
        "Humans with implanted high-bandwidth BCIs over time",
        "plots",
        "0",
        "points",
        "5",
        "note"
      ],
      "before": "Company headline: “21 Neuralnauts enrolled”. Implantation is supported by the body text, “higher signal quality across 18 of the subsequent 20 participants”, following the first recipient. Company-reported cumulative checkpoint dated Jan 28; the page was modified Feb 2. Current active-user status remains unaudited.",
      "after": "Company headline: “21 Neuralnauts enrolled”. Implantation is supported by the body text, “higher signal quality across 18 of the subsequent 20 participants”, following the first recipient. Company-reported cumulative checkpoint dated Jan 28; the page was modified Feb 2. Current active-user status remains unverified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "Recording contributors are not disclosed. Trial enrollment and the six participants in the performance analysis are not the denominator of >50,000 h. The first participant’s >9,000 h is a subset, not a per-person distribution.",
      "after": "The contributor count for >50,000 h is undisclosed. Trial enrollment and the six participants in the performance analysis describe different populations. The first participant’s >9,000 h is part of the total; other per-person durations are unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "1",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "2",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "3",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "4",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "5",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "6",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "1",
        "points",
        "7",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "2",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "Frozen DANDI 000055/0.220127.0436 assetsSummary.numberOfSubjects = 12, matching its reported 1,280 h. The descriptor reports 3–5 recording days per participant and 55 semi-continuous days total; these are not exact session counts or quality-valid hour ranges.",
      "after": "DANDI 000055/0.220127.0436 reports 12 subjects and 1,280 h. The descriptor gives 3–5 recording days per participant and 55 semi-continuous days total. Exact session counts and quality-valid hour ranges are unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "2",
        "points",
        "0",
        "supportingReferences",
        "0",
        "role"
      ],
      "before": "Recording-day context (not QC-hour distribution)",
      "after": "Recording days per participant"
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "3",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "The paper’s >100 h training corpus spans seven nonhuman primates and >158 sessions. Existing recordings are reused; constituent access varies. Neither lower bound gives a typical session or a per-animal duration distribution.",
      "after": "The paper’s >100 h training corpus spans seven nonhuman primates and >158 sessions. Existing recordings are reused; constituent access varies. Typical session length and the distribution of per-animal durations remain unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "4",
        "points",
        "0",
        "note"
      ],
      "before": "Abstract: “1020 hours of simultaneously recorded scalp electroencephalography (EEG), facial electromyography (EMG), and speech audio”. In descriptor v2 (November 17, 2026), authors report controlled access through Harvard Dataverse, with voice-masked audio. The point retains initial descriptor submission timing; archive upload timing remains unverified. Version 2 adds current access and duration evidence. Duration counts simultaneous modalities once; the release manifest remains unenumerated.",
      "after": "Abstract: “1020 hours of simultaneously recorded scalp electroencephalography (EEG), facial electromyography (EMG), and speech audio”. In descriptor v2 (November 17, 2026), authors report controlled access through Harvard Dataverse, with voice-masked audio. The point retains initial descriptor submission timing; archive upload timing remains unverified. Version 2 adds current access and duration evidence. Duration counts simultaneous modalities once; the released file inventory remains unverified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "4",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "Calculated from descriptor v2 Table 4 recording-hour cells: P01 ≈813.8 h, P02 ≈146.2 h, P03 ≈60.3 h. The shared covert-repetition/listening recordings are counted once. Rounded cells sum to 1,020.3 h versus Table 3’s 1,020.4 h; the plotted abstract total stays 1,020 h. These are accumulated per-person durations, not a continuous session or a publisher-reported range.",
      "after": "Calculated from descriptor v2 Table 4 recording-hour cells: P01 ≈813.8 h, P02 ≈146.2 h, P03 ≈60.3 h. Shared covert-repetition/listening recordings are counted once. Rounded cells sum to 1,020.3 h versus Table 3’s 1,020.4 h; the plotted abstract total stays 1,020 h. Per-person durations accumulate across recordings; the displayed range is calculated from these cells."
    },
    {
      "path": [
        "Open-access connectomics data over time",
        "plots",
        "0",
        "points",
        "5",
        "note"
      ],
      "before": "Public inventory of gs://flyem-male-cns/em/em-clahe-jpeg/ on November 3, 2026: 50,910,260,068,834 bytes across 27,594 image shards and one 633-byte metadata file, including all 11 resolution levels. Native 8 nm imagery: 44,428,865,656,516 bytes. Initial release: October 2025; v1.0 in June 2026 refined proofreading and annotations. Separate N5 imagery, segmentation, meshes and tables have separate footprints. The linked audit retains the complete snapshot and two-API verification. Tissue volume is 0.054 mm³, including brain and ventral nerve cord.",
      "after": "Public inventory of gs://flyem-male-cns/em/em-clahe-jpeg/ on November 3, 2026: 50,910,260,068,834 bytes across 27,594 image shards and one 633-byte metadata file, including all 11 resolution levels. Native 8 nm imagery: 44,428,865,656,516 bytes. Initial release: October 2025; v1.0 in June 2026 refined proofreading and annotations. Separate N5 imagery, segmentation, meshes and tables have separate footprints. The linked inventory documents the complete snapshot and verification through two APIs. Tissue volume is 0.054 mm³, including brain and ventral nerve cord."
    }
  ],
  "metric": [
    {
      "path": [
        "Humans with implanted high-bandwidth BCIs over time",
        "plots",
        "0",
        "points",
        "5",
        "note"
      ],
      "before": "Company headline: “21 Neuralnauts enrolled”. Implantation is supported by the body text, “higher signal quality across 18 of the subsequent 20 participants”, following the first recipient. Company-reported cumulative checkpoint dated Jan 28; the page was modified Feb 2. Current active-user status remains unaudited.",
      "after": "Company headline: “21 Neuralnauts enrolled”. Implantation is supported by the body text, “higher signal quality across 18 of the subsequent 20 participants”, following the first recipient. Company-reported cumulative checkpoint dated Jan 28; the page was modified Feb 2. Current active-user status remains unverified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "0",
        "recordingCoverage",
        "detail"
      ],
      "before": "Recording contributors are not disclosed. Trial enrollment and the six participants in the performance analysis are not the denominator of >50,000 h. The first participant’s >9,000 h is a subset, not a per-person distribution.",
      "after": "The contributor count for >50,000 h is undisclosed. Trial enrollment and the six participants in the performance analysis describe different populations. The first participant’s >9,000 h is part of the total; other per-person durations are unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "1",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "2",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "3",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "4",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "5",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "6",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "7",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "8",
        "recordingCoverage",
        "detail"
      ],
      "before": "Table 1 full-corpus patients and sessions for this exact release, including held-out evaluation. Overlapping releases are not additive; sessions are not unique people or continuous per-person durations.",
      "after": "Table 1 patient and session counts cover this exact full-corpus release, including held-out evaluation. Releases overlap. Sessions count recording occasions; patient counts identify people, and per-person durations accumulate across sessions."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "9",
        "recordingCoverage",
        "detail"
      ],
      "before": "Frozen DANDI 000055/0.220127.0436 assetsSummary.numberOfSubjects = 12, matching its reported 1,280 h. The descriptor reports 3–5 recording days per participant and 55 semi-continuous days total; these are not exact session counts or quality-valid hour ranges.",
      "after": "DANDI 000055/0.220127.0436 reports 12 subjects and 1,280 h. The descriptor gives 3–5 recording days per participant and 55 semi-continuous days total. Exact session counts and quality-valid hour ranges are unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "9",
        "supportingReferences",
        "0",
        "role"
      ],
      "before": "Recording-day context (not QC-hour distribution)",
      "after": "Recording days per participant"
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "10",
        "recordingCoverage",
        "detail"
      ],
      "before": "The paper’s >100 h training corpus spans seven nonhuman primates and >158 sessions. Existing recordings are reused; constituent access varies. Neither lower bound gives a typical session or a per-animal duration distribution.",
      "after": "The paper’s >100 h training corpus spans seven nonhuman primates and >158 sessions. Existing recordings are reused; constituent access varies. Typical session length and the distribution of per-animal durations remain unspecified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "11",
        "note"
      ],
      "before": "Abstract: “1020 hours of simultaneously recorded scalp electroencephalography (EEG), facial electromyography (EMG), and speech audio”. In descriptor v2 (November 17, 2026), authors report controlled access through Harvard Dataverse, with voice-masked audio. The point retains initial descriptor submission timing; archive upload timing remains unverified. Version 2 adds current access and duration evidence. Duration counts simultaneous modalities once; the release manifest remains unenumerated.",
      "after": "Abstract: “1020 hours of simultaneously recorded scalp electroencephalography (EEG), facial electromyography (EMG), and speech audio”. In descriptor v2 (November 17, 2026), authors report controlled access through Harvard Dataverse, with voice-masked audio. The point retains initial descriptor submission timing; archive upload timing remains unverified. Version 2 adds current access and duration evidence. Duration counts simultaneous modalities once; the released file inventory remains unverified."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "points",
        "11",
        "recordingCoverage",
        "detail"
      ],
      "before": "Calculated from descriptor v2 Table 4 recording-hour cells: P01 ≈813.8 h, P02 ≈146.2 h, P03 ≈60.3 h. The shared covert-repetition/listening recordings are counted once. Rounded cells sum to 1,020.3 h versus Table 3’s 1,020.4 h; the plotted abstract total stays 1,020 h. These are accumulated per-person durations, not a continuous session or a publisher-reported range.",
      "after": "Calculated from descriptor v2 Table 4 recording-hour cells: P01 ≈813.8 h, P02 ≈146.2 h, P03 ≈60.3 h. Shared covert-repetition/listening recordings are counted once. Rounded cells sum to 1,020.3 h versus Table 3’s 1,020.4 h; the plotted abstract total stays 1,020 h. Per-person durations accumulate across recordings; the displayed range is calculated from these cells."
    },
    {
      "path": [
        "Neural recording hours collected over time",
        "plots",
        "0",
        "connections",
        "0",
        "label"
      ],
      "before": "TUSZ releases (overlapping, not summed)",
      "after": "TUSZ releases (overlapping corpus snapshots)"
    },
    {
      "path": [
        "Open-access connectomics data over time",
        "plots",
        "0",
        "points",
        "5",
        "note"
      ],
      "before": "Public inventory of gs://flyem-male-cns/em/em-clahe-jpeg/ on November 3, 2026: 50,910,260,068,834 bytes across 27,594 image shards and one 633-byte metadata file, including all 11 resolution levels. Native 8 nm imagery: 44,428,865,656,516 bytes. Initial release: October 2025; v1.0 in June 2026 refined proofreading and annotations. Separate N5 imagery, segmentation, meshes and tables have separate footprints. The linked audit retains the complete snapshot and two-API verification. Tissue volume is 0.054 mm³, including brain and ventral nerve cord.",
      "after": "Public inventory of gs://flyem-male-cns/em/em-clahe-jpeg/ on November 3, 2026: 50,910,260,068,834 bytes across 27,594 image shards and one 633-byte metadata file, including all 11 resolution levels. Native 8 nm imagery: 44,428,865,656,516 bytes. Initial release: October 2025; v1.0 in June 2026 refined proofreading and annotations. Separate N5 imagery, segmentation, meshes and tables have separate footprints. The linked inventory documents the complete snapshot and verification through two APIs. Tissue volume is 0.054 mm³, including brain and ventral nerve cord."
    },
    {
      "path": [
        "Connectomics imaging cost efficiency",
        "plots",
        "0",
        "seriesNote"
      ],
      "before": "Table A1 Approx. Voxels/$ values, rather than digitized Figure 2 marks or throughput/hour divided by cost/hour. Figure 2 has TEMCA-GridTape without an exact table row, omits mesoSPIM, and differs for MultiSEM 706. mesoSPIM stays separate from expansion microscopy. PEEM is excluded from the historical EM fit.",
      "after": "Values reproduce the Approx. Voxels/$ column in Table A1. Figure 2 has TEMCA-GridTape without an exact table row, omits mesoSPIM, and differs for MultiSEM 706. mesoSPIM is a separate optical method. The historical EM fit uses reported technologies; PEEM is prospective."
    },
    {
      "path": [
        "Connectomics imaging cost efficiency",
        "plots",
        "0",
        "legend",
        "1",
        "label"
      ],
      "before": "EM · reported-tech estimates",
      "after": "EM · reported-technology estimates"
    },
    {
      "path": [
        "Connectomics imaging cost efficiency",
        "plots",
        "0",
        "referenceTrendlines",
        "0",
        "note"
      ],
      "before": "Equal-weight unconstrained OLS of log10(y) against year; N=4, 2015–2024. log10(y) = 8.689655172 + 0.2019704433 × (year − 2015). R² in log10 space = 0.753; doubling time = 1.49 years. Input IDs: exm2015, exllsm2019, exaspim2023, exaspim2024. Descriptive fit, confined to observed years; no future projection or confidence interval. Source: arXiv:2603.25713v1 Table A1 (p. 18). ExA-SPIM 2024 author estimate included. mesoSPIM excluded from expansion family.",
      "after": "Equal-weight unconstrained OLS of log10(y) against year; N=4, 2015–2024. log10(y) = 8.689655172 + 0.2019704433 × (year − 2015). R² in log10 space = 0.753; doubling time = 1.49 years. Input IDs: exm2015, exllsm2019, exaspim2023, exaspim2024. Descriptive fit confined to observed years, shown without a confidence interval. Source: arXiv:2603.25713v1 Table A1 (p. 18). ExA-SPIM 2024 author estimate included. mesoSPIM excluded from expansion family."
    },
    {
      "path": [
        "Connectomics imaging cost efficiency",
        "plots",
        "0",
        "referenceTrendlines",
        "1",
        "note"
      ],
      "before": "Equal-weight unconstrained OLS of log10(y) against year; N=4, 2018–2025. log10(y) = 8.065739885 + 0.1972196564 × (year − 2018). R² in log10 space = 0.683; doubling time = 1.53 years. Input IDs: sem2018, multisem506, multisem706, bdtem2024. Descriptive fit, confined to observed years; no future projection or confidence interval. Source: arXiv:2603.25713v1 Table A1 (p. 18). PEEM excluded as prospective; heterogeneous reported-tech estimates.",
      "after": "Equal-weight unconstrained OLS of log10(y) against year; N=4, 2018–2025. log10(y) = 8.065739885 + 0.1972196564 × (year − 2018). R² in log10 space = 0.683; doubling time = 1.53 years. Input IDs: sem2018, multisem506, multisem706, bdtem2024. Descriptive fit confined to observed years, shown without a confidence interval. Source: arXiv:2603.25713v1 Table A1 (p. 18). PEEM excluded as prospective; heterogeneous reported-tech estimates."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "seriesNote"
      ],
      "before": "Speech: PL R&D estimates use 1 assumed bit/character × five characters per word, including spaces (5 assumed bits/word). This context-dependent English-entropy model follows Stanford’s ‘Entropy and Redundancy in English,’ which describes estimates around 1 bit/letter. The selected weight and word-length factor are assumptions for these speech corpora. WPM × 5 × 1/60.\n\nHandwriting and text selection/scanning use an equiprobable 28-symbol modeling alphabet: 26 letters, a space and one extra symbol are our declared choice, not the actual task keyboard. log2(28) ≈ 4.8 assumed bits/character is an ideal finite-codebook equivalent, not measured English entropy or 8-bit storage (a literal fixed-width 28-symbol code needs 5 bits). This normalization convention uses CPM × log2(28)/60 or log2(28)/seconds-per-letter. Calculations use full precision.\n\nNo extra WER/CER penalty: native correct-character rates already include correction time; the gross pace of speech and handwriting keeps reported errors separate. Vansteensel uses the reported 33 seconds/letter timing, not native correct CPM. Assistance and tasks differ: dictionary disambiguation, prediction, completion and language models can contribute to output. Correlations and language-model output mean these are not measured neural information rates, error-standardized results or a common performance benchmark.\n\nThe mixed-convention descriptive fit includes 9 text-equivalent observations; 5 context marks are excluded: 3 native task/company bits/s rates and 2 approximate rates with unverified numerical sources. Years indicate publication, preprint, journal issue or company disclosure; source dates are shown per observation. Bacher uses the 2015 issue (online 2014); Stentrode the 2021 issue (online 2020); home speech the 2025 preprint (final paper 2026). The 2015 cursor-control point has an unverified source and year.",
      "after": "Speech: PL R&D estimates use 1 assumed bit/character × five characters per word, including spaces (5 assumed bits/word). This context-dependent English-entropy model follows Stanford’s ‘Entropy and Redundancy in English,’ which describes estimates around 1 bit/letter. The selected weight and word-length factor are assumptions for these speech corpora. WPM × 5 × 1/60.\n\nHandwriting and text selection/scanning use an equiprobable 28-symbol modeling alphabet: 26 letters, a space and one extra symbol define the chosen modeling alphabet; task keyboards vary. log2(28) ≈ 4.8 assumed bits/character is an ideal finite-codebook equivalent. Measured English entropy and 8-bit storage use different definitions (a literal fixed-width 28-symbol code needs 5 bits). This normalization convention uses CPM × log2(28)/60 or log2(28)/seconds-per-letter. Calculations use full precision.\n\nNative correct-character rates already include correction time. Speech and handwriting conversions retain gross pace, with WER/CER reported separately. Vansteensel uses the reported 33 seconds/letter timing. Assistance and tasks differ: dictionary disambiguation, prediction, completion and language models can contribute to output. The estimates describe task output under these different forms of assistance. Correlations and language-model contributions remain part of the assisted output; each estimate retains its task’s error metric and summary statistic.\n\nThe mixed-convention descriptive fit includes 9 text-equivalent observations; 5 context marks are excluded: 3 native task/company bits/s rates and 2 approximate rates with unverified numerical sources. Years indicate publication, preprint, journal issue or company disclosure; source dates are shown per observation. Bacher uses the 2015 issue (online 2014); Stentrode the 2021 issue (online 2020); home speech the 2025 preprint (final paper 2026). The 2015 cursor-control point has an unverified source and year."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "0",
        "note"
      ],
      "before": "Unverified estimate. Approximately 0.24 bits/s; source-native numerical rate unverified. No text conversion. Publication/disclosure: 2000 (paper publication year). The paper is identified at metadata/abstract level; its full numerical result is unverified. No typing-rate conversion is used for this dot. Context; excluded from fit.",
      "after": "Unverified estimate. Approximately 0.24 bits/s; source-native numerical rate unverified. The dot retains the approximate visual rate. Publication/disclosure: 2000 (paper publication year). The paper is identified from its metadata and abstract; its full numerical result remains unverified. The dot retains the approximate visual rate. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "0",
        "exportNote"
      ],
      "before": "Unverified estimate. Approximately 0.24 bits/s; source-native numerical rate unverified. No text conversion. Publication/disclosure: 2000 (paper publication year). The paper is identified at metadata/abstract level; its full numerical result is unverified. No typing-rate conversion is used for this dot. Context; excluded from fit.",
      "after": "Unverified estimate. Approximately 0.24 bits/s; source-native numerical rate unverified. The dot retains the approximate visual rate. Publication/disclosure: 2000 (paper publication year). The paper is identified from its metadata and abstract; its full numerical result remains unverified. The dot retains the approximate visual rate. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "1",
        "note"
      ],
      "before": "Unverified estimate. Approximately 0.9 bits/s; source-native numerical rate unverified. No text conversion. Source and publication year are unverified. Context; excluded from fit.",
      "after": "Unverified estimate. Approximately 0.9 bits/s; source-native numerical rate unverified. The dot retains the approximate visual rate. Source and publication year are unverified. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "1",
        "exportNote"
      ],
      "before": "Unverified estimate. Approximately 0.9 bits/s; source-native numerical rate unverified. No text conversion. Source and publication year are unverified. Context; excluded from fit.",
      "after": "Unverified estimate. Approximately 0.9 bits/s; source-native numerical rate unverified. The dot retains the approximate visual rate. Source and publication year are unverified. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "2",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 9.4 ± 3.2 correct characters/minute; radial ‘keyboard ’ condition, completion off; ambiguous-key disambiguation retained (not the 10.4-CPM completion condition). 9.4 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Completion is off; ambiguous-key disambiguation remains. Publication/disclosure: 2014-11-10 (first online publication; 2015 journal issue).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 9.4 ± 3.2 correct characters/minute in the radial keyboard condition with completion off and ambiguous-key disambiguation retained. The completion-on condition reports 10.4 CPM. 9.4 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Completion is off; ambiguous-key disambiguation remains. Publication/disclosure: 2014-11-10 (first online publication; 2015 journal issue).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "2",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 9.4 ± 3.2 correct characters/minute; radial ‘keyboard ’ condition, completion off; ambiguous-key disambiguation retained (not the 10.4-CPM completion condition). 9.4 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Completion is off; ambiguous-key disambiguation remains. Publication/disclosure: 2014-11-10 (first online publication; 2015 journal issue).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 9.4 ± 3.2 correct characters/minute in the radial keyboard condition with completion off and ambiguous-key disambiguation retained. The completion-on condition reports 10.4 CPM. 9.4 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Completion is off; ambiguous-key disambiguation remains. Publication/disclosure: 2014-11-10 (first online publication; 2015 journal issue).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "3",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 33 seconds/letter with prediction assistance (= 60/33 characters/minute), rather than the rounded two letters/minute summary. (60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance. No error penalty; no extra WER/CER factor. Publication/disclosure: 2016-11-12 (first online publication).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 33 seconds/letter with prediction assistance (= 60/33 characters/minute); the summary rounds this to two letters/minute. (60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance; WER/CER factors are omitted from the conversion. Publication/disclosure: 2016-11-12 (first online publication).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "3",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 33 seconds/letter with prediction assistance (= 60/33 characters/minute), rather than the rounded two letters/minute summary. (60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance. No error penalty; no extra WER/CER factor. Publication/disclosure: 2016-11-12 (first online publication).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 33 seconds/letter with prediction assistance (= 60/33 characters/minute); the summary rounds this to two letters/minute. (60/33) characters/minute × log2(28) bits/character ÷ 60 = log2(28)/33 bits/s. Gross output pace with prediction assistance; WER/CER factors are omitted from the conversion. Publication/disclosure: 2016-11-12 (first online publication).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "4",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning. 6.88 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Word completion remains part of the task. Publication/disclosure: 2018-04-25 (first online publication).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning. 6.88 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Word completion remains part of the task. Publication/disclosure: 2018-04-25 (first online publication).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "4",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning. 6.88 correct characters/minute × log2(28) bits/character ÷ 60. No extra error penalty: correct CPM already accounts for correction. Word completion remains part of the task. Publication/disclosure: 2018-04-25 (first online publication).  Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 6.88 ± 0.33 correct characters/minute, T6 free spelling with word completion using FlashSpeller neural-switch scanning. 6.88 correct characters/minute × log2(28) bits/character ÷ 60. Correct CPM includes correction time, so the conversion uses that rate directly. Word completion remains part of the task. Publication/disclosure: 2018-04-25 (first online publication).  Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "5",
        "note"
      ],
      "before": "Paper-reported. Reported input: 4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2017-02-21 (paper publication). The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart uses the 9×9 mean, not the single 4.36-bits/s example block. Context; excluded from fit.",
      "after": "Paper-reported. Reported input: 4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2017-02-21 (paper publication). The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart uses the 9×9 mean; 4.36 bits/s describes one example block. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "5",
        "exportNote"
      ],
      "before": "Paper-reported. Reported input: 4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2017-02-21 (paper publication). The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart uses the 9×9 mean, not the single 4.36-bits/s example block. Context; excluded from fit.",
      "after": "Paper-reported. Reported input: 4.16 ± 0.39 bits/s, T5 9×9 grid; mean across eight blocks/two days. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2017-02-21 (paper publication). The paper also reports 3.7 ± 0.4 bits/s for T5 on a 6×6 grid. The chart uses the 9×9 mean; 4.36 bits/s describes one example block. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "6",
        "note"
      ],
      "before": "Company-reported. Reported input: 8.0 bits/s achieved Webgrid performance, Neuralink's May 8, 2024 update; not a peer-reviewed paper. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2024-05-08 (company disclosure). This is a company disclosure, not independent validation. Context; excluded from fit.",
      "after": "Company-reported. Reported input: 8.0 bits/s achieved Webgrid performance, reported in Neuralink's May 8, 2024 company update. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2024-05-08 (company disclosure). Neuralink reports this result in its company disclosure; independent validation remains unverified. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "6",
        "exportNote"
      ],
      "before": "Company-reported. Reported input: 8.0 bits/s achieved Webgrid performance, Neuralink's May 8, 2024 update; not a peer-reviewed paper. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2024-05-08 (company disclosure). This is a company disclosure, not independent validation. Context; excluded from fit.",
      "after": "Company-reported. Reported input: 8.0 bits/s achieved Webgrid performance, reported in Neuralink's May 8, 2024 company update. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2024-05-08 (company disclosure). Neuralink reports this result in its company disclosure; independent validation remains unverified. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "7",
        "note"
      ],
      "before": "Paper-reported estimate. Reported input: 0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; this is the authors' isolated-contribution estimate, not the hybrid 1.57-bits/s result. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2020-10-28 (online publication; February 2021 journal issue). The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s. Context; excluded from fit.",
      "after": "Paper-reported estimate. Reported input: 0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; the hybrid result was 1.57 bits/s. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2020-10-28 (online publication; February 2021 journal issue). The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "7",
        "exportNote"
      ],
      "before": "Paper-reported estimate. Reported input: 0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; this is the authors' isolated-contribution estimate, not the hybrid 1.57-bits/s result. Native task bits/s retained as reported; not converted using the text convention. Publication/disclosure: 2020-10-28 (online publication; February 2021 journal issue). The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s. Context; excluded from fit.",
      "after": "Paper-reported estimate. Reported input: 0.46 bits/s, participant 2 mean estimated isolated motor-neuroprosthesis contribution. Actual typing also used eye tracking; the hybrid result was 1.57 bits/s. Native task bits/s retained under the source’s task-specific definition. Publication/disclosure: 2020-10-28 (online publication; February 2021 journal issue). The isolated contribution is an author estimate; actual typing used eye tracking. Participant 1's isolated estimate was 0.32 bits/s. Context; excluded from fit."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "8",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021. 90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace, not measured neural ITR. No error penalty; 5.4% CER remains separate. Publication/disclosure: 2021-05-12 (first online publication; issue 2021-05-13). The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The 90-CPM gross pace is converted by PL R&D without a CER penalty. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021. 90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace. The conversion retains the gross rate; 5.4% CER is reported separately. Publication/disclosure: 2021-05-12 (first online publication; issue 2021-05-13). The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The 90-CPM gross pace is converted by PL R&D without a CER penalty. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "8",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021. 90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace, not measured neural ITR. No error penalty; 5.4% CER remains separate. Publication/disclosure: 2021-05-12 (first online publication; issue 2021-05-13). The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The 90-CPM gross pace is converted by PL R&D without a CER penalty. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 90 characters/minute with 5.4% character error rate on the final evaluation day, from Willett et al. 2021. 90 characters/minute × log2(28) bits/character ÷ 60. PL R&D code-equivalent estimate of gross decoding pace. The conversion retains the gross rate; 5.4% CER is reported separately. Publication/disclosure: 2021-05-12 (first online publication; issue 2021-05-13). The final-day 5.4% character error rate is distinct from the overall five-day 94.1% accuracy. The 90-CPM gross pace is converted by PL R&D without a CER penalty. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "9",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 15.2 words/minute; real-time visually prompted sentence decoding, language model enabled. 25.6% word error rate. 15.2 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2021-07-14 (first online publication; issue 2021-07-15). Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation, not a per-trial channel estimate. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 15.2 words/minute; real-time visually prompted sentence decoding, language model enabled. 25.6% word error rate. 15.2 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2021-07-14 (first online publication; issue 2021-07-15). Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation; the conversion uses the reported WPM median. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "9",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 15.2 words/minute; real-time visually prompted sentence decoding, language model enabled. 25.6% word error rate. 15.2 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2021-07-14 (first online publication; issue 2021-07-15). Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation, not a per-trial channel estimate. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 15.2 words/minute; real-time visually prompted sentence decoding, language model enabled. 25.6% word error rate. 15.2 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2021-07-14 (first online publication; issue 2021-07-15). Prompted sentences with a language model and a restricted 50-word vocabulary. WPM and WER are source-level medians with different aggregation; the conversion uses the reported WPM median. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "10",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 62 words/minute; real-time held-out prompted sentences. 23.8% word error rate. 62 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2023-08-23 (first online publication). The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences, not free conversation. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 62 words/minute; real-time held-out prompted sentences. 23.8% word error rate. 62 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2023-08-23 (first online publication). The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "10",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 62 words/minute; real-time held-out prompted sentences. 23.8% word error rate. 62 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2023-08-23 (first online publication). The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences, not free conversation. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 62 words/minute; real-time held-out prompted sentences. 23.8% word error rate. 62 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2023-08-23 (first online publication). The 23.8% WER applies to the 125,000-word vocalized condition; the paper's 9.1% WER belongs to a separate 50-word condition. Evaluation used held-out prompted sentences. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "11",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 78.3 words/minute; real-time text decoding of held-out silently attempted prompted sentences. 25.5% word error rate. 78.3 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2023-08-23 (first online publication). Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 78.3 words/minute; real-time text decoding of held-out silently attempted prompted sentences. 25.5% word error rate. 78.3 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2023-08-23 (first online publication). Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "11",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 78.3 words/minute; real-time text decoding of held-out silently attempted prompted sentences. 25.5% word error rate. 78.3 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2023-08-23 (first online publication). Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 78.3 words/minute; real-time text decoding of held-out silently attempted prompted sentences. 25.5% word error rate. 78.3 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2023-08-23 (first online publication). Online evaluation used 1,024 words. The 39,378-word condition was an offline simulation; a later anatomical correction did not change real-time decoding performance. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "12",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 31.6 words/minute; prompted copy task at self-paced speaking rate. 2.5% word error rate. 31.6 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2024-08-14 (first online publication; issue 2024-08-15). 31.6 WPM and 2.5% WER are the final five copy-task session means. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 31.6 words/minute; prompted copy task at self-paced speaking rate. 2.5% word error rate. 31.6 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2024-08-14 (first online publication; issue 2024-08-15). 31.6 WPM and 2.5% WER are the final five copy-task session means. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "12",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 31.6 words/minute; prompted copy task at self-paced speaking rate. 2.5% word error rate. 31.6 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2024-08-14 (first online publication; issue 2024-08-15). 31.6 WPM and 2.5% WER are the final five copy-task session means. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 31.6 words/minute; prompted copy task at self-paced speaking rate. 2.5% word error rate. 31.6 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2024-08-14 (first online publication; issue 2024-08-15). 31.6 WPM and 2.5% WER are the final five copy-task session means. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "13",
        "note"
      ],
      "before": "PL R&D estimate. Reported input: 56.1 words/minute; unconstrained personal use at home. 56.1 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2025-07-07 (bioRxiv v1 posting, not DOI date string; peer-reviewed online publication 2026-06-15). Personal home use has no paired WER here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024, not an independent cohort. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 56.1 words/minute; unconstrained personal use at home. 56.1 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2025-07-07 (bioRxiv v1 posting; peer-reviewed online publication 2026-06-15). WER paired with personal home use is unspecified here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "points",
        "13",
        "exportNote"
      ],
      "before": "PL R&D estimate. Reported input: 56.1 words/minute; unconstrained personal use at home. 56.1 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. No error penalty; the reported error metric remains separate. Publication/disclosure: 2025-07-07 (bioRxiv v1 posting, not DOI date string; peer-reviewed online publication 2026-06-15). Personal home use has no paired WER here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024, not an independent cohort. Text-equivalent; fit included.",
      "after": "PL R&D estimate. Reported input: 56.1 words/minute; unconstrained personal use at home. 56.1 words/minute × 5 assumed characters/word × 1 assumed bit/character ÷ 60. PL R&D estimate of gross decoding pace under a context-dependent English-entropy model; five characters/word includes spaces. The conversion retains the gross rate; the reported error metric is shown separately. Publication/disclosure: 2025-07-07 (bioRxiv v1 posting; peer-reviewed online publication 2026-06-15). WER paired with personal home use is unspecified here. The 99.2% copy-task accuracy and 92.3% participant-rated sentence correctness are different endpoints. This follows the same participant as Card 2024. Text-equivalent; fit included."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "referenceTrendline",
        "note"
      ],
      "before": "Equal-weight ordinary least squares of log10(text-equivalent bits/s) against year across 9 converted-text observations; 5 context marks are excluded (3 native task-bps, 2 approximate rates with unverified numerical sources). log10(rate) = -0.486667 + 0.132164 × (year − 2015); R² in log10 space = 0.658101. Mixed-convention descriptive fit over 2015–2025: five speech estimates use 1 assumed bit/character × 5 assumed characters/word; handwriting and three text-selection/scanning estimates use log2(28) bits/character. Tasks, assistance, errors and summary statistics differ; this heterogeneous subset is not a common performance benchmark, measured neural ITR, causal growth estimate or forecast. No confidence band is shown.",
      "after": "Equal-weight ordinary least squares of log10(text-equivalent bits/s) against year across 9 converted-text observations; 5 context marks are excluded (3 native task-bps, 2 approximate rates with unverified numerical sources). log10(rate) = -0.486667 + 0.132164 × (year − 2015); R² in log10 space = 0.658101. Mixed-convention descriptive fit over 2015–2025: five speech estimates use 1 assumed bit/character × 5 assumed characters/word; handwriting and three text-selection/scanning estimates use log2(28) bits/character. Tasks, assistance, errors and summary statistics differ. The fit summarizes heterogeneous model-derived text-output rates across the observed years; the line is shown without a confidence band."
    },
    {
      "path": [
        "BCI communication rates over time",
        "plots",
        "0",
        "exportPointKeyNote"
      ],
      "before": "Study key · years · bits/s. PL R&D estimates: speech 1 bit/char × 5 char/word; other text 28-symbol. Mixed-model fit; context not fitted.",
      "after": "Study key · years · bits/s. PL R&D estimates: speech 1 bit/char × 5 char/word; other text 28-symbol. Mixed-model fit; context outside the fit."
    }
  ],
  "definitions": [
    {
      "path": [
        "0",
        "axes"
      ],
      "before": "x-axis: year · y-axis: tissue volume (requested cm³)",
      "after": "x-axis: year · y-axis: tissue volume (cm³)"
    },
    {
      "path": [
        "3",
        "definition"
      ],
      "before": "Include imaging, compute, storage, and proofreading at a comparable quality threshold.",
      "after": "End-to-end imaging, compute, storage and proofreading costs at a comparable quality threshold."
    },
    {
      "path": [
        "3",
        "constraint"
      ],
      "before": "Do not infer linear scale-up from partial cost reports or omit CPU, memory, storage, or labor.",
      "after": "A comparable estimate specifies scale-up assumptions and includes CPU, memory, storage and labor."
    },
    {
      "path": [
        "6",
        "definition"
      ],
      "before": "Compare traceability assays across human samples and preservation methods.",
      "after": "Connection traceability in human samples under stated preservation methods."
    },
    {
      "path": [
        "7",
        "definition"
      ],
      "before": "Measure lost or damaged tissue with a stated denominator and sample size.",
      "after": "Lost or damaged tissue as a fraction of a stated sample, with sample size reported."
    },
    {
      "path": [
        "7",
        "constraint"
      ],
      "before": "Do not substitute sectioning speed or qualitative lossless claims for a measured loss rate.",
      "after": "A measured loss rate specifies the lost or damaged tissue and its denominator; sectioning speed describes a different process measure."
    },
    {
      "path": [
        "8",
        "definition"
      ],
      "before": "Report cell-type, synaptic-sign, and receptor labels separately from label accuracy.",
      "after": "Cell-type, synaptic-sign and receptor-label coverage, with label accuracy reported separately."
    },
    {
      "path": [
        "8",
        "constraint"
      ],
      "before": "Use one selected label class and denominator; coverage is not accuracy.",
      "after": "Coverage is the fraction labeled within one selected label class and denominator. Accuracy describes how often those labels are correct."
    },
    {
      "path": [
        "12",
        "definition"
      ],
      "before": "Measure comparable disease, control, or treatment cohorts rather than a single largest map.",
      "after": "Independently mapped specimens in comparable disease, control or treatment cohorts."
    },
    {
      "path": [
        "12",
        "constraint"
      ],
      "before": "Keep specimen count separate from neuron count, synapse count, and map volume; deduplicate reused animals.",
      "after": "Specimen counts identify unique animals within each cohort; neuron counts, synapse counts and map volumes describe its reconstruction scale."
    },
    {
      "path": [
        "14",
        "definition"
      ],
      "before": "Count publications that analyze an existing public dataset under stated corpus and counting rules.",
      "after": "Publications that analyze an existing public dataset, counted within a defined corpus under stated rules."
    },
    {
      "path": [
        "14",
        "constraint"
      ],
      "before": "Reuse is not citation; the corpus and reuse classification require validation.",
      "after": "Reuse identifies publications that analyze the dataset. A comparable share uses a validated corpus and reuse classification."
    },
    {
      "path": [
        "16",
        "definition"
      ],
      "before": "The inclusion unit must be chosen explicitly: models, runs, organisms, or independently validated emulations.",
      "after": "A count of models, runs, organisms or independently validated emulations, using one explicitly selected unit."
    },
    {
      "path": [
        "16",
        "constraint"
      ],
      "before": "Do not substitute fidelity for count or inflate the series by treating repeated runs as independent models.",
      "after": "Counts use the selected unit consistently: repeated runs belong to one model when models are the unit. Fidelity describes model performance."
    }
  ]
};
function restore(value, changes, allowPartial = false) {
  const copy = structuredClone(value);
  for (const change of changes) {
    if (allowPartial && !Object.hasOwn(copy, change.path[0])) continue;
    let target = copy;
    for (const key of change.path.slice(0, -1)) {
      assert.ok(target && Object.hasOwn(target, key), `Missing reviewed copy path: ${change.path.join('.')}`);
      target = target[key];
    }
    const key = change.path.at(-1);
    // Composition is idempotent only for the exact reviewed before/after pair.
    assert.ok(target?.[key] === change.before || target?.[key] === change.after,
      `Unexpected scientific copy: ${change.path.join('.')}`);
    target[key] = change.before;
  }
  return copy;
}
export function beforeScientificCopy(evidence) {
  const plots = evidence['Neural recording hours collected over time']?.plots;
  const metric = plots?.some(plot => plot.id === 'recording-hours') ?? Object.hasOwn(evidence, 'Connectomics imaging cost efficiency');
  return restore(evidence, metric ? delta.metric : delta.draft, true);
}
export const beforeScientificAcquisitionCopy = evidence => restore(evidence, delta.metric.filter(change => change.path[0] === 'Connectomics imaging cost efficiency'), true);
export const beforeScientificDefinitions = definitions => restore(definitions, delta.definitions);
