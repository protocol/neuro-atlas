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
  /** Optional presentation override; otherwise the existing group palette applies. */
  color?: string;
  /** Centered on the source coordinates; defaults to a circle. */
  marker?: "circle" | "square" | "triangle";
  note?: string;
  /** Short persistent caption; presentation only, never changes x/y. */
  annotation?: string;
};

export type DraftPlot = {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  scale: "linear" | "log";
  /** Count axes use whole-number ticks without changing source values. */
  integerTicks?: boolean;
  scope: string;
  points: DraftObservation[];
  xKind?: "year" | "number";
  seriesNote?: string;
  /** Optional dataset key; use the same colors and markers as the observations. */
  legend?: { label: string; color: string; marker?: DraftObservation["marker"] }[];
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
