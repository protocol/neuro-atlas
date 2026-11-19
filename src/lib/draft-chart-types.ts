import type { HistoricalLogFit } from "./historical-log-fit";
export type DraftTrendline = { id?: string; label: string; color: string; note: string; methodologyUrl?: string; methodologyLabel?: string; directLabel?: string; points: { x: number; y: number }[]; fit?: HistoricalLogFit };

/** A reported, derived or reconstructed observation with explicit qualifiers and scope. */
export type DraftObservation = {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Omit when the source identity or a verifiable public record is unresolved. */
  sourceUrl?: string;
  sourceTitle: string;
  quote: string;
  dateLabel: string;
  qualifier?: string;
  group?: string;
  /** Optional presentation override; otherwise the existing group palette applies. */
  color?: string;
  /** Centered on the source coordinates; defaults to a circle. */
  marker?: "circle" | "square" | "triangle" | "diamond";
  note?: string;
  /** Short persistent caption; presentation only, never changes x/y. */
  annotation?: string;
  /** Compact image-only identity; verbose annotation and source notes stay on site. */
  exportAnnotation?: string;
  /** Decisive point-specific provenance retained in standalone chart exports. */
  exportNote?: string;
  /** Related papers are leads, not confirmed attributions for this observation. */
  candidateSources?: { title: string; url: string; note: string }[];
  /** A verified methods reference, distinct from a candidate study attribution. */
  calculationSource?: { title: string; url: string };
};

export type DraftPlot = {
  id: string;
  title: string;
  /** Concise card labels; full chart, exports and link identity retain title/units. */
  previewTitle?: string;
  previewYLabel?: string;
  xLabel: string;
  yLabel: string;
  scale: "linear" | "log";
  /** Count axes use whole-number ticks without changing source values. */
  integerTicks?: boolean;
  /** Display precision only; coordinates and source values retain their full precision. */
  valueSignificantDigits?: number;
  scope: string;
  points: DraftObservation[];
  xKind?: "year" | "number";
  /** Positive whole-year calendar spacing; invalid or >100 labels fall back to default ticks. */
  yearTickStep?: number;
  seriesNote?: string;
  /** Descriptive fitted or traced trend, separate from observations and study connections. */
  referenceTrendline?: DraftTrendline;
  /** Multiple independent method fits; the legacy single line remains supported. */
  referenceTrendlines?: DraftTrendline[];
  /** Explicit source-supported identities only; never infer a path from color/category. */
  connections?: { id: string; label: string; pointIds: string[] }[];
  /** Optional evidence basis; default preserves source-reported charts. */
  observationBasis?: string;
  /** Discovery index for selected observations; numerical evidence stays with the point sources. */
  curationSource?: { title: string; url: string };
  /** Append concise numbered observation identities to the exported image key. */
  exportPointKey?: boolean;
  /** One shared scope label for the compact image-only study key. */
  exportPointKeyNote?: string;
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
