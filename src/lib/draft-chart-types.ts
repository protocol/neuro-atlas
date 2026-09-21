/** A source-reported measurement; qualifiers and scope are part of the value. */
export type DraftObservation = {
  id: string;
  x: number;
  y: number;
  label: string;
  sourceUrl: string;
  sourceTitle: string;
  quote: string;
  dateLabel: string;
  qualifier?: string;
  group?: string;
  note?: string;
};

export type DraftPlot = {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  scale: "linear" | "log";
  scope: string;
  points: DraftObservation[];
  xKind?: "year" | "number";
  seriesNote?: string;
};

export type DraftEvent = {
  id: string;
  dateLabel: string;
  year: number;
  label: string;
  stage: string;
  sourceUrl: string;
  sourceTitle: string;
  quote: string;
  note: string;
};

export type DraftChartEvidence = {
  status: "plotted" | "gap";
  summary: string;
  plots: DraftPlot[];
  gapReason?: string;
  timeline?: { scope: string; events: DraftEvent[] };
};
