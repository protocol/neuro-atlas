# Larger preview dots

Request: existing dots in the unopened Field Velocity charts should be about 80% larger. Preview-only; enlarged charts, native exports, source values, layout and access remain unchanged.

## Implementation

- Shared preview radius: 4 → 7.2 screen pixels (diameter 8 → 14.4 pixels), across reference curves, scientific observations and event timelines. Noncircular observation glyphs and existing overlap rings retain their shapes and source positions at the same 1.8× linear scale.
- Annual-publication preview uses that shared screen-space radius.
- Publication-growth preview endpoint radius: 5 → 9 SVG units, preserving its existing proportional scaling. Full-chart endpoint radius stays 5 SVG units.
- Legend keys, reference rings, typography and line strokes are not enlarged. Google Trends remains a line-only preview; no dots are added. Waffles and Sankey ribbons are unchanged.

## Verification

Baseline main: `592c039b6bf21198e177bafe0f81e267b4415ff7` (merged PR96). Baseline browser production build: `c940a1343e6d9c4dd52ebae805f59458e6026ea5`; runtime sources/config/package files verified identical to main before replay. Candidate runtime: `7a36dbafcbd1cded805ccf3395e051f760d05f59`.

Actual headed Chrome at 1440/390/320px, using an isolated production build with a loopback-only QA proxy in a disposable clone. The hosted access gate is unchanged. Captures are local-build evidence, not authenticated hosted screenshots.

- All 24 cards across five Metrics sections retained their heights.
- All 167 existing preview data marks per width grew by exactly 1.8× (501 measured comparisons), with centers, source IDs/values, colors and outlines unchanged. See `verification.json`.
- Opened annual publication, publication growth, citation-latency and recording-hours charts in Chrome; canonical full-chart mark radii stayed unchanged (5px screen-space where normalized; growth keeps its existing 5 SVG units; overlap rings retain multiples of the base). See `full-chart-verification.json`.
- 37 focused renderer/publication tests passed, including RED→GREEN checks for 7.2px preview marks and growth endpoints. Production build, typecheck and changed-source ESLint passed.
- Full-suite and independent-review terminal receipts are reported in the PR handoff.

The contact sheets preserve actual before/after browser pixels. Only labels above the screenshots were added.
