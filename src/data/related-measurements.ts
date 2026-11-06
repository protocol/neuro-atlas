export type RelatedMeasurement = {
  anchor: string;
  label: string;
  relationship: string;
  scope: string;
};

/** Links to measured supporting capabilities and adoption. */
export const RELATED_MEASUREMENTS: Record<string, readonly RelatedMeasurement[]> = {
  "The BCI app store": [
    {
      anchor: "metric-implanted-bci-humans",
      label: "Implanted BCI recipients",
      relationship: "Adoption proxy",
      scope: "Selected chronic intracortical research recipients.",
    },
  ],
  "Neural distillation": [
    {
      anchor: "metric-recording-hours",
      label: "Neural recording hours",
      relationship: "Data supply",
      scope: "Human scalp EEG and intracranial recordings, plus nonhuman-primate training data; datasets shown separately.",
    },
  ],
  "The neuromorphic energy pivot": [
    {
      anchor: "metric-panel-neuroai-imagenet",
      label: "NeuroAI performance–energy",
      relationship: "Performance–energy",
      scope: "ImageNet accuracy versus estimated inference energy.",
    },
  ],
  "Memory retrieval in simulation": [
    {
      anchor: "metric-paired-structure-function",
      label: "Paired structure–function datasets",
      relationship: "Enabling capability",
      scope: "Anatomy and activity matched in the same mouse specimen.",
    },
    {
      anchor: "metric-panel-flyvis-contrast",
      label: "Simulation fidelity",
      relationship: "Functional validation",
      scope: "Fly visual-system contrast preference.",
    },
  ],
};
