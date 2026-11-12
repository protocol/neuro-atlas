/** Calendar divisions, not observation indices; numeric scatter axes never use these. */
export function annualYears(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  const first = Math.ceil(min), last = Math.floor(max);
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}

/** UTC January 1 boundaries inside the existing date domain, including leap years. */
export function annualDateYears(start: number, end: number) {
  return annualYears(new Date(start).getUTCFullYear(), new Date(end).getUTCFullYear())
    .filter(year => Date.UTC(year, 0, 1) >= start && Date.UTC(year, 0, 1) <= end);
}

export function ChartYearGuides({ years, x, top, bottom }: {
  years: number[]; x: (year: number) => number; top: number; bottom: number;
}) {
  return <g aria-hidden="true" pointerEvents="none">{years.map(year => <line key={year} data-year-guide={year}
    x1={x(year)} x2={x(year)} y1={top} y2={bottom}
    stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />)}</g>;
}
