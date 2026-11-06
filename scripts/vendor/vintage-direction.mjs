// Direction math for the idea-vintage instrument.
//
// The sign is INVERTED for this instrument: a FALLING median reference age means
// new work is building on fresher ideas, i.e. the field is ACCELERATING.
//
// Why not read two endpoints, or the earliest-vs-latest window means? Because a
// field accumulates its own canon: reference age drifts UPWARD mechanically as a
// literature ages, so an 18-year level shift (2005-07 vs 2021-23) reads
// "decelerating" for every field older than ~15 years regardless of its actual
// recent pace. That is a level, not a velocity. So we:
//
//   1. Fit a two-segment piecewise-linear model to find any changepoint.
//   2. Read the slope of the RECENT segment only (after the changepoint, or the
//      whole line if there is no changepoint).
//   3. Call a direction only when that slope clears its own noise band, where the
//      band is the slope's standard error (residual scatter / spread in x), NOT a
//      hardcoded constant. Everything else is 'flat' (confidently level) or
//      'unclear' (too noisy / too short to say).
//
// Pure ES module (no TypeScript, no deps) so it can be imported by both the
// Next build (via the TS ingestion lib) and `node --test`.

/** Least-squares slope (y per unit x), used for rising-is-good count series. */
export function trailingSlope(points, window = 5) {
  const pts = points.slice(-window)
  const n = pts.length
  if (n < 2) return null
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
    sxx += p.x * p.x
    sxy += p.x * p.y
  }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  return (n * sxy - sx * sy) / denom
}

/** Mean of the earliest and most recent `w` reliable points (sorted ascending). */
export function windowMeans(points, w = 3) {
  if (!points.length) return null
  const k = Math.min(w, points.length)
  const mean = (arr) => arr.reduce((s, p) => s + p.y, 0) / arr.length
  const early = points.slice(0, k)
  const late = points.slice(-k)
  return {
    early: mean(early),
    late: mean(late),
    earlyRange: [early[0].x, early[early.length - 1].x],
    lateRange: [late[0].x, late[late.length - 1].x],
  }
}

/** OLS fit of y~x. Returns slope, intercept, residual SSE, Sxx, and n. */
function fitLine(pts) {
  const n = pts.length
  if (n < 2) return null
  let sx = 0
  let sy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
  }
  const mx = sx / n
  const my = sy / n
  let sxx = 0
  let sxy = 0
  for (const p of pts) {
    sxx += (p.x - mx) * (p.x - mx)
    sxy += (p.x - mx) * (p.y - my)
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = my - slope * mx
  let sse = 0
  for (const p of pts) {
    const e = p.y - (intercept + slope * p.x)
    sse += e * e
  }
  return { slope, intercept, sse, sxx, n }
}

/**
 * Two-segment piecewise-linear changepoint. Scans every split with at least
 * `minSeg` points on each side, fits an independent line to each side, and picks
 * the split that minimises total squared error. `improved` is true only when the
 * two-segment fit beats a single line by at least `improveRatio` of the single
 * line's SSE (a plain SSE-ratio threshold, chosen over an F-test to stay
 * dependency-free; 0.25 means the split must explain a quarter of the residual
 * variance to count). Returns null if the series is too short to split.
 */
export function ideaVintageChangepoint(reliablePoints, { minSeg = 4, improveRatio = 0.25 } = {}) {
  const pts = (reliablePoints ?? []).slice().sort((a, b) => a.x - b.x)
  if (pts.length < 2 * minSeg) return null
  const single = fitLine(pts)
  if (!single) return null

  let best = null
  for (let i = minSeg; i <= pts.length - minSeg; i++) {
    const left = fitLine(pts.slice(0, i))
    const right = fitLine(pts.slice(i))
    if (!left || !right) continue
    const sse = left.sse + right.sse
    if (!best || sse < best.sse) {
      best = { sse, splitIdx: i, slopeBefore: left.slope, slopeAfter: right.slope }
    }
  }
  if (!best) return null

  const improved = single.sse > 0 ? (single.sse - best.sse) / single.sse >= improveRatio : false
  return {
    year: pts[best.splitIdx].x,
    slopeBefore: best.slopeBefore,
    slopeAfter: best.slopeAfter,
    improved,
  }
}

/**
 * Direction of the idea-vintage instrument, from reliable points only.
 *
 * Preconditions (any failing → 'unclear'): at least `minReliable` reliable
 * points, and a recent segment we can fit a slope + its standard error to.
 *
 * The recent segment is the run after the changepoint when a changepoint
 * meaningfully improves the fit, otherwise the whole series. We take that
 * segment's slope and its standard error `se = sqrt(sse/(n-2)) / sqrt(Sxx)`:
 *   - slope + z·se  <  0  → accelerating (median age is confidently falling)
 *   - slope − z·se  >  0  → decelerating (confidently rising)
 *   - CI straddles 0 and is TIGHT (z·se ≤ negligibleSlope) → 'flat'
 *   - CI straddles 0 and is WIDE  → 'unclear' (pure noise lands here)
 *
 * `negligibleSlope` (years of reference-age drift per calendar year) only sets
 * the flat-vs-unclear boundary; the direction call itself is governed by the
 * data-derived standard error, never a hardcoded band.
 */
export function ideaVintageDirection(
  reliablePoints,
  { minReliable = 10, minSeg = 4, z = 1.96, negligibleSlope = 0.1 } = {},
) {
  const pts = (reliablePoints ?? []).slice().sort((a, b) => a.x - b.x)
  if (pts.length < minReliable) return 'unclear'

  const cp = ideaVintageChangepoint(pts, { minSeg })
  const recent = cp && cp.improved ? pts.filter((p) => p.x >= cp.year) : pts
  const fit = fitLine(recent)
  if (!fit || recent.length < minSeg || fit.n <= 2) return 'unclear'

  const sigma = Math.sqrt(fit.sse / (fit.n - 2))
  const se = sigma / Math.sqrt(fit.sxx)
  if (!Number.isFinite(se) || se === 0) {
    // Perfect fit: no residual scatter. Trust the sign if it moves at all.
    if (fit.slope < 0) return 'accelerating'
    if (fit.slope > 0) return 'decelerating'
    return 'flat'
  }
  const half = z * se
  if (fit.slope + half < 0) return 'accelerating' // CI entirely below 0: falling age
  if (fit.slope - half > 0) return 'decelerating' // CI entirely above 0: rising age
  return half <= negligibleSlope ? 'flat' : 'unclear'
}
