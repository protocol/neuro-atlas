/** Hidden chart content is kept off-flow solely for stable, responsive sizing. */
export function metricSizingVisibility(hidden: boolean) {
  return { hidden, inert: hidden, "aria-hidden": hidden || undefined, "data-metric-size-hidden": true };
}
