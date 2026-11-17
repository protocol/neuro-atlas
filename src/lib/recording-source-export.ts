import type { RecordingView } from "@/data/recording-evidence";
import type { HistoricalLogFit } from "./historical-log-fit";

/** Selected chart values, including source precision and any descriptive fit. */
export function recordingViewCsv(view: RecordingView, fit?: HistoricalLogFit) {
  const rows: unknown[][] = [["id", "label", "source_date", "date_precision", "date_basis", "plot_decimal_year", "reported_value", "qualifier", "unit", "preparation", "source_url", "note", "fit_n", "fit_r_squared_log10", "fit_doubling_years", "fit_equation"]];
  for (const point of view.points) rows.push([
    point.id, point.label, point.date, point.datePrecision, point.dateBasis, point.plotYear ?? "", point.value,
    point.qualifier ?? "", point.unit, point.preparation, point.sourceUrl, point.note,
    fit?.n ?? "", fit?.rSquaredLog10 ?? "", fit?.doublingYears ?? "", fit?.equation ?? "",
  ]);
  return rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"','""')}"`).join(",")).join("\r\n") + "\r\n";
}
