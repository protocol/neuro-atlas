import type { MeasurementPoint } from "@/lib/field-velocity/schema";

/** Curated separately from the unchanged historical provider export. */
export type RecordingObservation = MeasurementPoint & {
  id: string;
  unit: string;
  preparation: string;
  quote: string;
};
export type RecordingView = {
  id: "electrical" | "human-channels" | "optical";
  label: string;
  unit: string;
  description: string;
  caveat: string;
  chartKind: "scatter";
  extrapolation: false;
  points: RecordingObservation[];
};
export const RECORDING_CHECKED_AT = "2026-11-04";
export const RECORDING_VIEWS: RecordingView[] = [
  {
    id: "electrical", label: "Electrical units per session", unit: "electrical units",
    description: "Selected in-vivo brain recordings from individual sessions. Source-defined putative single neurons, stable units and manually curated neurons retain their different quality criteria; these are not a uniform single-neuron benchmark.",
    caveat: "Not a world-record adjudication or an exhaustive frontier. No pooling across animals, sessions, sequential probe banks or single- and multi-units. Channels are not distinct isolated neurons.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "jun-2017", date: "2017-11-09", datePrecision: "day", dateBasis: "publication", value: 741,
        label: "Jun et al. · Neuropixels", unit: "putative single neurons",
        preparation: "Awake head-fixed mouse brain · in vivo · two probes across five structures",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/", sourceLabel: "Jun et al., Nature (2017)",
        quote: "In this experiment, we recorded 741 putative single neurons simultaneously.",
        note: "741 putative single neurons in one simultaneous recording; automated sorting plus manual curation, not anatomically confirmed cells.",
      },
      {
        id: "stringer-2019", date: "2019-04-18", datePrecision: "day", dateBasis: "publication", value: 2668,
        label: "Stringer et al. · eight Neuropixels probes", unit: "stable electrical units",
        preparation: "Awake mouse brain · in vivo · eight simultaneous probes · one of three mice",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6525101/", sourceLabel: "Stringer et al., Science (2019), final paper",
        quote: "From recordings in three mice, we extracted 2,296, 2,668 and 1,462 units stable across ~1 hour of ongoing activity",
        note: "2,668 stable units over approximately one hour: the largest of three separate populations in the final paper, not their sum. Retains the source term units; the older preprint's 2,998 is not substituted. April 18 is final edited publication (April 19 issue).",
      },
      {
        id: "trautmann-2025", date: "2025-06-23", datePrecision: "day", dateBasis: "publication", value: 1012,
        label: "Trautmann et al. · six simultaneous probes", unit: "reported neurons",
        preparation: "Macaque brain · in vivo · six simultaneous Neuropixels probes · one session",
        sourceUrl: "https://www.nature.com/articles/s41593-025-01976-5", sourceLabel: "Trautmann et al., Nature Neuroscience (2025)",
        quote: "This approach was tested on two sessions, in which we recorded from 6 and 7 probes, yielding 1,012 and 783 neurons, respectively.",
        note: "1,012 reported neurons; counts remain subjective under manual curation (Kilosort plus Phy), not a uniform purity threshold. The separate face-patch example's 622 single units plus 505 multi-units is not combined here; 3,029 across sequential banks is excluded.",
      },
    ],
  },
  {
    id: "human-channels", label: "Human implant channels", unit: "implant channels / electrodes",
    description: "Selected human speech-BCI implant observations, not isolated-neuron yield. Electrode counts and company-reported implant channels describe hardware scope, not necessarily active or usable channels in a recording.",
    caveat: "Channels are not isolated neurons. These two studies are not a growth record, worldwide total or comparative clinical-performance ranking. The same implant is not counted again for each paper.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "card-2026", date: "2026-06-15", datePrecision: "day", dateBasis: "publication", value: 256,
        label: "Card et al. · home-use speech BCI", unit: "implanted electrodes",
        preparation: "Human speech motor cortex · four 64-electrode arrays · implanted intracortical BCI",
        sourceUrl: "https://www.nature.com/articles/s41591-026-04414-6", sourceLabel: "Card et al., Nature Medicine (2026)",
        quote: "Neural activity was recorded from 256 electrodes",
        note: "256 electrodes, with 512 decoder features (threshold crossings and spike-band power), not 512 channels. This is the same implant as the participant's 2024 NEJM speech study, not an independent new implant or growth record. June 15 is online publication (July issue), not an implant or experiment date.",
      },
      {
        id: "neuralink-voice-2026", date: "2026-09-18", datePrecision: "day", dateBasis: "disclosure", value: 3000, qualifier: "approximate",
        label: "Neuralink · human VOICE demonstration", unit: "implant channels",
        preparation: "Human speech motor region · implanted VOICE-study participant · company demonstration",
        sourceUrl: "https://www.youtube.com/watch?v=_j806JHhCRo&t=170s", sourceLabel: "Neuralink, Speaking With The Mind (September 18, 2026), 2:50–3:17",
        quote: "And so there's 3000 of those channels in this implant.",
        note: "Approximately 3,000 company-reported channels in this human implant; active or usable signal yield is not specified. No exact 3,072-channel claim and no count of distinct isolated neurons. Date is video disclosure, not implantation or recording date.",
      },
    ],
  },
  {
    id: "optical", label: "Optical cellular signals", unit: "neuronal signals",
    description: "Achieved light-beads calcium imaging in mouse dorsal cortex. The largest-field observation is 1,136,223 neuronal signals at 2.2 volumes/s; sampling rate and preparation are part of the measurement, not optional context.",
    caveat: "Calcium cellular signals are not electrical spikes or human implant channels. One selected study is not an optical world-record census; no connecting trend or extrapolation is inferred.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "manley-2024", date: "2024-03-06", datePrecision: "day", dateBasis: "publication", value: 1136223,
        label: "Manley et al. · light-beads microscopy", unit: "neuronal signals",
        preparation: "Mouse dorsal cortex · calcium imaging · optical cellular signals",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11098699/", sourceLabel: "Manley et al., Neuron (March 6, 2024), Methods",
        quote: "and 5.4×6×0.5 mm3, 5 μm spacing, at 2.2 Hz (523,139 – 1,136,223 neurons).",
        note: "Largest reported field: 1,136,223 neuronal signals at 2.2 volumes/s. The Methods range is 523,139–1,136,223, not a sum across fields. Calcium sensor kinetics and volume sampling differ from millisecond electrical spike recordings.",
      },
    ],
  },
];
