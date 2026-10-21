export type RelatedMeasurement = {
  anchor: string;
  label: string;
  relationship: string;
  scope: string;
};

/** Links to existing measured evidence, not a progress score or resolution rule. */
export const RELATED_MEASUREMENTS: Record<string, readonly RelatedMeasurement[]> = {
  "The BCI app store": [
    {
      anchor: "metric-implanted-bci-humans",
      label: "Implanted BCI recipients",
      relationship: "Adoption proxy",
      scope: "Research recipients, not third-party app users.",
    },
  ],
  "Neural distillation": [
    {
      anchor: "metric-recording-hours",
      label: "Neural recording hours",
      relationship: "Data supply",
      scope: "Human EEG and intracranial tracks; datasets stay separate.",
    },
  ],
  "The neuromorphic energy pivot": [
    {
      anchor: "metric-panel-neuroai-imagenet",
      label: "NeuroAI performance–energy",
      relationship: "Performance–energy",
      scope: "ImageNet comparison with estimated inference energy.",
    },
  ],
  "Memory retrieval in simulation": [
    {
      anchor: "metric-paired-structure-function",
      label: "Paired structure–function datasets",
      relationship: "Enabling capability",
      scope: "Anatomy and activity from the same mouse specimen.",
    },
    {
      anchor: "metric-panel-flyvis-contrast",
      label: "Simulation fidelity",
      relationship: "Functional validation",
      scope: "Fly visual responses, not learned mouse behavior.",
    },
  ],
};
