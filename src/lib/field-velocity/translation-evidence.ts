import RAW from "@/data/field-velocity/bci-translation-evidence.json";
import type { PlotData } from "@/components/performance-curves";

const DAY = 86_400_000;
const YEAR = 365.2425 * DAY;

/** Calendar precision becomes an explicit elapsed-time range, never a fabricated event day. */
export function calendarBounds(date: string, precision: string): readonly [number, number] {
  const pattern = precision === "day" ? /^\d{4}-\d{2}-\d{2}$/ : precision === "month" ? /^\d{4}-\d{2}$/ : /^\d{4}$/;
  if (!["day", "month", "year"].includes(precision) || !pattern.test(date)) throw new Error("Date precision disagrees with source date");
  const [year, month = 1, day = 1] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  if (new Date(start).toISOString().slice(0, date.length) !== date) throw new Error("Invalid source calendar date");
  const end = precision === "day" ? start : precision === "month" ? Date.UTC(year, month, 0) : Date.UTC(year, 11, 31);
  return [start, end];
}

export const TRANSLATION_EVIDENCE = RAW;
export type TranslationPair = typeof RAW.intervals[number];
export function reportInterval(pair: TranslationPair) {
  const [reportStart, reportEnd] = calendarBounds(pair.report.date, pair.report.precision);
  const [humanStart, humanEnd] = calendarBounds(pair.human.date, pair.human.precision);
  const lo = (humanStart - reportEnd) / YEAR;
  const hi = (humanEnd - reportStart) / YEAR;
  if (!Number.isFinite(lo) || lo < 0 || hi < lo) throw new Error("Invalid report-to-human chronology");
  for (const endpoint of [pair.report, pair.human]) {
    const url = new URL(endpoint.url);
    if (url.protocol !== "https:" || url.username || url.password || !endpoint.quotes.length) throw new Error("Unsourced translation endpoint");
  }
  return { lo, hi, value: (lo + hi) / 2, reportAnchor: new Date(reportStart).toISOString().slice(0, 10) };
}

export function translationPlot(): PlotData {
  if (RAW.measurement !== "selected-report-to-human") throw new Error("Unknown translation metric");
  return {
    title: "Latency compression — selected report-to-human intervals",
    xLabel: "Selected preclinical report / demo year",
    unit: "years", scale: "linear", line: false,
    tracks: [{ id: "implant", label: "Documented human implant" }, { id: "temporary-placement", label: "Temporary human placement" }],
    points: RAW.intervals.map(pair => {
      const interval = reportInterval(pair);
      const label = `${pair.label}: approximately ${interval.value.toFixed(1)} years; ${pair.report.date} (${pair.report.precision} precision, ${pair.report.basis}) to ${pair.human.date} (${pair.human.precision} precision, ${pair.human.basis}); ${pair.species}.`;
      return { date: interval.reportAnchor, value: interval.value, lo: interval.lo, hi: interval.hi,
        track: pair.clinicalEndpoint, trackIndex: pair.clinicalEndpoint === "temporary-placement" ? 1 : 0,
        label, qualifiedValueLabel: label };
    }),
  };
}
