# Milestones legibility candidate

Scope: `milestone-timeline.tsx` only, plus this note and the focused regression suite. No data, feed, authentication, global CSS, export or other chart changes.

- Essential labels, legend pills, summary copy and tooltip text have a 12px minimum. Labels use neutral foreground/muted tokens and normal case; existing Geist inheritance is unchanged. Lane headings no longer depend on pale stage colors for text contrast. Semantic stage colors remain on marks, backgrounds, filters and the capital line.
- January's text anchors inward while its date/grid coordinate remains exactly 0%. All other month coordinates and dated logo centers retain their original percentage formula.
- Closed year columns reserve 72px; the focused year reserves 240px. The year strip scrolls locally where the minimum footprints exceed available width. Its top padding protects the existing month-scroll action from overflow clipping.
- Expanded stage subfilters wrap; the Clinical inventory no longer forces one unbroken row.
- A ResizeObserver measures the actual plot width. Row packing requires 34px logo tokens plus 4px separation in rendered pixels, without shifting dates or shrinking the categorical logos. Existing row-count-derived lane heights grow and recover on resize.

## Verification

Each of the five regressions was first observed failing, then passed after its bounded implementation in `tests/milestone-legibility.test.mjs`. The packing test reproduces overlapping centers at 92.31px and 120.88px in an 800px plot before the fix, checks exact before/after percentage centers, 34px token height, extra row height, and recovery at 1360px.

Passed: 18 focused tests across `milestone-legibility`, `milestones-years`, `milestones-reconciliation-and-filter`, `company-blog-milestones`, and `tooltip-clamp`; `npm run typecheck` (`next typegen && tsc --noEmit`); `git diff --check`.

ESLint was executed for the component and test. It reports the same two inherited errors as the untouched parent component at base `34aa687e9ee6de131cc614bd14ce077df0c8903b`: synchronous existing `setNow` in an effect (`react-hooks/set-state-in-effect`) and existing local lane accumulator `y += ...` (`react-hooks/immutability`). No unrelated lint refactor is included. npm also emits the environment's existing unknown `jobs` config warning.

Native layout/contrast/screenshots, independent critique and full-suite integration remain the parent's acceptance work. In particular, verify the nested local year-strip/plot scrolling at 320px, the expanded Clinical legend at narrow widths, and native folded-panel resizing. jsdom exercises real component state and the measured-width observer with controlled rectangles; it does not establish native pixel acceptance.
