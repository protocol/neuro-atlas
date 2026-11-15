export type LogLinearFit = {
  n: number;
  xOrigin: number;
  interceptLog10: number;
  slopeLog10PerX: number;
  rSquaredLog10: number | null;
  points: { x: number; y: number }[];
};

/** Equal-weight OLS of log10(y) against x; descriptive fit over the input domain only. */
export function fitLogLinear(points: readonly { x: number; y: number }[]): LogLinearFit {
  if (points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y <= 0)) {
    throw new Error("Log-linear fitting requires at least two finite points with positive outputs.");
  }
  const ordered = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = ordered.length;
  const xOrigin = ordered[0].x;
  const centered = ordered.map(p => ({ x: p.x - xOrigin, z: Math.log10(p.y) }));
  const meanX = centered.reduce((sum, p) => sum + p.x, 0) / n;
  const meanZ = centered.reduce((sum, p) => sum + p.z, 0) / n;
  const sxx = centered.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  if (!(sxx > 0) || !Number.isFinite(sxx)) throw new Error("Log-linear fitting requires a finite nonzero x span.");
  const slopeLog10PerX = centered.reduce((sum, p) => sum + (p.x - meanX) * (p.z - meanZ), 0) / sxx;
  const interceptLog10 = meanZ - slopeLog10PerX * meanX;
  const total = centered.reduce((sum, p) => sum + (p.z - meanZ) ** 2, 0);
  const residual = centered.reduce((sum, p) => sum + (p.z - interceptLog10 - slopeLog10PerX * p.x) ** 2, 0);
  const rSquaredLog10 = total > 0 ? Math.max(0, Math.min(1, 1 - residual / total)) : null;
  const fitted = [ordered[0].x, ordered[n - 1].x].map(x => ({ x, y: 10 ** (interceptLog10 + slopeLog10PerX * (x - xOrigin)) }));
  if (fitted.some(p => !Number.isFinite(p.y) || p.y <= 0)) throw new Error("Fitted output exceeds the finite positive range.");
  return { n, xOrigin, interceptLog10, slopeLog10PerX, rSquaredLog10, points: fitted };
}
