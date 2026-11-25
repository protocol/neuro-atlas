/** Equal-weight unconstrained OLS of log10(y) against x, descriptive only.
 * Reject invalid input instead of silently changing the selected cohort.
 */
export function fitHistoricalLog(rows: readonly { id: string; x: number; y: number }[]) {
  if (rows.length < 2 || rows.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y <= 0)
    || new Set(rows.map(p => p.id)).size !== rows.length) return null;
  const first = Math.min(...rows.map(p => p.x)), last = Math.max(...rows.map(p => p.x));
  if (first === last) return null;
  const xs = rows.map(p => p.x - first), logs = rows.map(p => Math.log10(p.y));
  const meanX = xs.reduce((a,b) => a+b, 0) / rows.length;
  const meanY = logs.reduce((a,b) => a+b, 0) / rows.length;
  const slope = xs.reduce((sum,x,i) => sum + (x-meanX)*(logs[i]-meanY), 0) / xs.reduce((sum,x) => sum+(x-meanX)**2, 0);
  const intercept = meanY - slope * meanX;
  const total = logs.reduce((sum,y) => sum+(y-meanY)**2, 0);
  const residual = logs.reduce((sum,y,i) => sum+(y-intercept-slope*xs[i])**2, 0);
  return {
    inputIds: rows.map(p => p.id), n: rows.length, window: [first,last] as [number,number],
    xOrigin: first, interceptLog10: intercept, slopeLog10PerYear: slope,
    rSquaredLog10: total > 0 ? Math.max(0, Math.min(1, 1-residual/total)) : null,
    doublingYears: slope > 0 ? Math.log10(2)/slope : null,
    equation: `log10(y) = ${intercept.toPrecision(10)} + ${slope.toPrecision(10)} × (year − ${first})`,
    points: [first,last].map(x => ({ x, y: 10 ** (intercept + slope*(x-first)) })),
  };
}
export type HistoricalLogFit = NonNullable<ReturnType<typeof fitHistoricalLog>>;
export function historicalFitNote(fit: HistoricalLogFit) {
  return `Equal-weight unconstrained OLS of log10(y) against year; N=${fit.n}, ${fit.window.join("–")}. ${fit.equation}. R² in log10 space = ${fit.rSquaredLog10?.toFixed(3) ?? "undefined (constant values)"}; doubling time = ${fit.doublingYears?.toFixed(2) ?? "undefined"} years. Input IDs: ${fit.inputIds.join(", ")}. Descriptive fit confined to observed years, shown without a confidence interval.`;
}
