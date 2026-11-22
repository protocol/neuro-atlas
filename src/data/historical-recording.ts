import source from "./historical-recording.source.json";
import sourceLinkAlternates from "./source-link-alternates.json";
import { fitHistoricalLog, historicalFitNote } from "@/lib/historical-log-fit";
import type { RecordingView } from "./recording-evidence";

/** Faithful producer selection, not an independently re-curated world-record census.
 * Strict earlier-date comparison means same-date ties do not outrank one another.
 */
export const HISTORICAL_RECORDING_ROWS = source.rows.map((row, index) => ({
  ...row, id: `stevenson-r${String(index + 2).padStart(3, "0")}`,
  x: Number(row.Year) + ((Number(row.Month) || 6.5) - .5) / 12,
  y: Number(row.Neurons),
}));
export const HISTORICAL_RECORDING_SELECTED = HISTORICAL_RECORDING_ROWS.filter(row =>
  HISTORICAL_RECORDING_ROWS.filter(other => other.x < row.x && other.y >= row.y).length < 10);
export const HISTORICAL_RECORDING_FIT = fitHistoricalLog(HISTORICAL_RECORDING_SELECTED)!;
export const HISTORICAL_RECORDING_FIT_NOTE = historicalFitNote(HISTORICAL_RECORDING_FIT);
/** Map the producer's decimal-year coordinate into the renderer's UTC time domain. */
export function historicalYearDate(year: number) {
  const whole = Math.floor(year);
  return new Date(Math.round(Date.UTC(whole,0,1) + (year-whole) * (Date.UTC(whole+1,0,1)-Date.UTC(whole,0,1)))).toISOString();
}
export const HISTORICAL_RECORDING: RecordingView = {
  id: "historical", label: "Historical electrical recordings", unit: "reported neurons / experiment",
  description: "Stevenson–Kording historical electrical-recording tracker, 1957–2022: first 10 papers to achieve at least each reported count (94 of 162 tracker rows). Counts retain the tracker’s original curation and mixed preparations.",
  caveat: "Publication months and reported neuron counts reproduce the tracker. Species, preparation and unit-quality criteria are incomplete; retina and culture experiments are included. Preprints and later papers may overlap. This selected literature history is not an exhaustive census or a uniform in-vivo single-session benchmark.",
  chartKind: "scatter", extrapolation: false,
  points: HISTORICAL_RECORDING_SELECTED.map(row => ({
    id: row.id, date: `${row.Year}-${String(Number(row.Month) || 7).padStart(2,"0")}-01`,
    datePrecision: Number(row.Month) ? "month" as const : "year" as const, dateBasis: "publication" as const,
    value: row.y, plotYear: row.x, label: `${row.Authors.trim()} (${row.Year})`, unit: "reported neurons",
    preparation: row["Method Note"] ? `Tracker method note: ${row["Method Note"]}; species / preparation otherwise unspecified` : "Species / preparation unspecified in tracker",
    sourceUrl: sourceLinkAlternates[row.DOI.trim().toLowerCase() as keyof typeof sourceLinkAlternates] ?? (row.DOI.trim() || source.sourceUrl), sourceLabel: `${row.Authors.trim()}, ${row.Publication} (${row.Year}) · tracker entry`,
    qualifier: /approximate|average/i.test(row["Method Note"]) ? "approximate" as const : undefined,
    quote: `${row.Year}, ${row.Month}, ${row.Neurons}, ${row.Authors}, ${row.Publication}, ${row["Method Note"]}, ${row.DOI}`,
    note: `Tracker transcription, CSV row ${Number(row.id.slice(-3))}. Original neuron-count criteria retained; individual primary-study criteria are not harmonized. ${row["Method Note"] || "No method note in tracker."} Plot date follows producer: year + (month − 0.5)/12; missing month is 6.5.`,
  })),
};
export const HISTORICAL_RECORDING_SOURCE = { ...source, rows: undefined };
