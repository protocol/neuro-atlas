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
    description: "Selected in-vivo brain recordings from individual sessions. Counts follow each study’s sorting and curation criteria.",
    caveat: "Each point is one animal and session. Putative neurons, stable units and manually curated neurons have study-specific quality criteria.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "jun-2017", date: "2017-11-09", datePrecision: "day", dateBasis: "publication", value: 741,
        label: "Jun et al. · Neuropixels", unit: "putative single neurons",
        preparation: "Awake head-fixed mouse brain · in vivo · two probes across five structures",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/", sourceLabel: "Jun et al., Nature (2017)",
        quote: "In this experiment, we recorded 741 putative single neurons simultaneously.",
        note: "741 putative single neurons in one simultaneous recording, identified by automated sorting and manual curation.",
      },
      {
        id: "stringer-2019", date: "2019-04-18", datePrecision: "day", dateBasis: "publication", value: 2668,
        label: "Stringer et al. · eight Neuropixels probes", unit: "stable electrical units",
        preparation: "Awake mouse brain · in vivo · eight simultaneous probes · one of three mice",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6525101/", sourceLabel: "Stringer et al., Science (2019), final paper",
        quote: "From recordings in three mice, we extracted 2,296, 2,668 and 1,462 units stable across ~1 hour of ongoing activity",
        note: "2,668 stable units over approximately one hour, the largest of three separate populations in the final paper. April 18 is online publication; April 19 is the issue date.",
      },
      {
        id: "trautmann-2025", date: "2025-06-23", datePrecision: "day", dateBasis: "publication", value: 1012,
        label: "Trautmann et al. · six simultaneous probes", unit: "reported neurons",
        preparation: "Macaque brain · in vivo · six simultaneous Neuropixels probes · one session",
        sourceUrl: "https://www.nature.com/articles/s41593-025-01976-5", sourceLabel: "Trautmann et al., Nature Neuroscience (2025)",
        quote: "This approach was tested on two sessions, in which we recorded from 6 and 7 probes, yielding 1,012 and 783 neurons, respectively.",
        note: "1,012 reported neurons from six simultaneous probes in one session. Counts remain subjective under manual Kilosort/Phy curation.",
      },
    ],
  },
  {
    id: "human-channels", label: "Human implant channels", unit: "implant channels / electrodes",
    description: "Implanted electrodes and company-reported channels in selected human speech-BCI studies.",
    caveat: "Counts describe implant hardware. Active channel yield and isolated-neuron yield require separate measurements; each implant appears once.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "card-2026", date: "2026-06-15", datePrecision: "day", dateBasis: "publication", value: 256,
        label: "Card et al. · home-use speech BCI", unit: "implanted electrodes",
        preparation: "Human speech motor cortex · four 64-electrode arrays · implanted intracortical BCI",
        sourceUrl: "https://www.nature.com/articles/s41591-026-04414-6", sourceLabel: "Card et al., Nature Medicine (2026)",
        quote: "Neural activity was recorded from 256 electrodes",
        note: "256 implanted electrodes supplied 512 decoder features (threshold crossings and spike-band power). The same implant appears in the participant’s 2024 NEJM study. June 15 is online publication; July is the issue month.",
      },
      {
        id: "neuralink-voice-2026", date: "2026-09-18", datePrecision: "day", dateBasis: "disclosure", value: 3000, qualifier: "approximate",
        label: "Neuralink · human VOICE demonstration", unit: "implant channels",
        preparation: "Human speech motor region · implanted VOICE-study participant · company demonstration",
        sourceUrl: "https://www.youtube.com/watch?v=_j806JHhCRo&t=170s", sourceLabel: "Neuralink, Speaking With The Mind (September 18, 2026), 2:50–3:17",
        quote: "And so there's 3000 of those channels in this implant.",
        note: "Approximately 3,000 company-reported implant channels. Active or usable signal yield remains unverified. The date is the video disclosure.",
      },
    ],
  },
  {
    id: "optical", label: "Optical cellular signals", unit: "neuronal signals",
    description: "Light-beads calcium imaging in mouse dorsal cortex: 1,136,223 neuronal signals at 2.2 volumes/s in the largest reported field.",
    caveat: "One selected study, with its stated calcium-sensor kinetics, preparation and volume-sampling rate.",
    chartKind: "scatter", extrapolation: false,
    points: [
      {
        id: "manley-2024", date: "2024-03-06", datePrecision: "day", dateBasis: "publication", value: 1136223,
        label: "Manley et al. · light-beads microscopy", unit: "neuronal signals",
        preparation: "Mouse dorsal cortex · calcium imaging · optical cellular signals",
        sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11098699/", sourceLabel: "Manley et al., Neuron (March 6, 2024), Methods",
        quote: "and 5.4×6×0.5 mm3, 5 μm spacing, at 2.2 Hz (523,139 – 1,136,223 neurons).",
        note: "Largest reported field: 1,136,223 neuronal signals at 2.2 volumes/s. The Methods range is 523,139–1,136,223 across fields.",
      },
    ],
  },
];
