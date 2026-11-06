import type { DraftPlot } from "@/lib/draft-chart-types";

/** Presentation only: source coordinates, tooltips and tables stay untouched. */
export function neuroaiEnergyAxis(plot: DraftPlot, left: number, right: number) {
  if (plot.id !== "neuroai-imagenet" || plot.xKind !== "number" || plot.scale !== "linear") return null;
  const values = plot.points.map(point => point.x);
  // Only omit the verified empty interval. If evidence changes, fail back to the
  // ordinary full-range axis rather than dropping or clamping a new observation.
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 44 || (value > 6 && value < 40))
    || values.filter(value => value <= 6).length < 2 || !values.some(value => value >= 40)) return null;

  const gap = Math.min(32, (right - left) * 0.28);
  const available = right - left - gap;
  const segments = [
    { min: 0, max: 6, start: left, end: left + available * 0.75 },
    { min: 40, max: 44, start: left + available * 0.75 + gap, end: right },
  ];
  const x = (value: number) => {
    const segment = segments.find(segment => value >= segment.min && value <= segment.max);
    // No interpolation/extrapolation across the omitted interval.
    return segment ? segment.start + (value - segment.min) / (segment.max - segment.min) * (segment.end - segment.start) : NaN;
  };
  // Prioritize outer bounds and break endpoints. Sparse ticks are preferable to
  // overlapping labels on narrow cards; the note always names both gap bounds.
  const ticks: number[] = [];
  for (const candidate of [0, 44, 6, 40, 2, 4, 42]) {
    if (ticks.every(tick => Math.abs(x(candidate) - x(tick)) >= (String(candidate).length + String(tick).length) * 3.5 + 8)) ticks.push(candidate);
  }
  return {
    segments, x, ticks: ticks.sort((a, b) => a - b),
    center: (segments[0].end + segments[1].start) / 2,
    note: "X-axis break: 6–40 mJ/image omitted (no observations). Linear segments; different scales.",
  };
}
