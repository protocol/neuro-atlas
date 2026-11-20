# Chart pop-out source-layout cleanup

## Requested outcome

- Avoid excessively narrow, tall supporting-text columns.
- Give the reading/definition and source-note regions equal desktop width; stack before they become cramped.
- Open **Definition and comparability** by default while keeping it collapsible.
- Consolidate the overlapping source list and source-data disclosure without losing citations or measurement qualifications.

## Result

The supporting regions use equal tracks above 960px and one column at/below 960px. Nested definition fields are one column, not another grid squeezed inside a half-width region.

For curated numeric charts, **Source notes** keeps measurement scope and discovery credit. The duplicated standalone reference list and repeated table-introduction scope are removed. The single full-width **Data and sources** disclosure retains observation values, exact date bases, primary/supporting citations, source quotations, conversion references and notes. Source scope remains in inline/non-modal renders. Timeline source links remain with their individual events rather than in a duplicate reference list.

The portaled curated table now has explicit destination-scoped styling. Its label/date/value columns have protected widths instead of being compressed by the long source-notes column. Narrow screens scroll the table horizontally; the page and dialog body do not overflow horizontally.

No scientific source data, plotted coordinates, chart export implementation, URL registry, routing, auth, analytics or deployment configuration is changed. This PR is separate from the unmerged persistent-graph-page work.

## Revision and verification

- Production build/typecheck and native captures: runtime source `ab1c038f8f4425a461cffa194bc526002c96430a`.
- Reviewed source/evidence revision: `a9f64690c049090d1010ea3a5894a3d5f4b25312`. Its runtime source is identical; subsequent documentation/log commits are evidence only.
- Clean production build (`NEXT_PUBLIC_BASE_PATH=/neuro-atlas npm run build`) and `npm run typecheck`: pass.
- ESLint on the three edited TSX files: pass.
- Focused component/scientific-preservation suite: **80 passed, 0 failed**. See `focused-tests.log`.
- Additional legacy layout regressions: **14 passed, 0 failed**. See `layout-tests.log`.
- Native headed-browser regression: **30 unique cases**, five chart families at 1440/1024/900/768/390/320px. See `browser-report.json` and `scripts/qa/popup-source-layout-20261120.py`.
- Browser checks include exact opened titles, equal/stacked regions, body/document bounds, source-table widths, native data disclosure, expanded/collapsible definitions, horizontal table reachability, Escape/scroll-lock release, and retained legacy BCI fragment after reload.
- The original layout failed the new equal-width browser assertion: 611px reading region versus 300px sidebar (275px source content). The old data-table headers were approximately 61–64px wide. These were measured on the actual production-built route, not a CSS-only fixture.
- Independent review located one stale test requiring the intentionally removed duplicate scope paragraph. The test now checks scope in Source notes and retained table rows without relaxing the plot-before-prose guard. Bounded re-review passed on `a9f6469`, including desktop/mobile screenshots.

## Evidence and limits

The PNGs are real localhost production-build browser captures, not hosted-preview captures or generated design mockups. `before-sources-1440.png` captures the baseline source sidebar; after screenshots show the consolidated version and default-expanded definitions.

The broad full-suite attempt was interrupted/timed out and is **not** presented as an all-green full-suite result. Final acceptance uses the complete focused suite and additional layout suite above, successful build/typecheck/lint, native replay and independent review. One early native summary activation was unhandled; the final replay remeasures and permits one retry only while the same summary remains closed. Its failed screenshot remains in private task diagnostics.

Viewport-emulated mouse/pointer behavior is verified, not physical-phone touch. Mobile tables intentionally require horizontal scrolling to reach the remaining columns. No merge or production release has been performed.
