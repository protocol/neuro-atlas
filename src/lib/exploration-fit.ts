import { fitHistoricalLog } from "@/lib/historical-log-fit";

/** Independent series only. Ten-year sensitivity, without target crossings or confidence claims. */
export function exploreFit(rows: readonly { x: number; y: number; id: string }[], label: string, color: string) {
  const fit = fitHistoricalLog(rows);
  if (!fit || fit.n < 3 || !(fit.slopeLog10PerYear > 1e-12) || fit.rSquaredLog10 === null) return null;
  const end = fit.window[1] + 10;
  const last = 10 ** (fit.interceptLog10 + fit.slopeLog10PerYear * (end - fit.xOrigin));
  if (!Number.isFinite(last) || last <= 0) return null;
  return { ...fit, end, last, label, color };
}
