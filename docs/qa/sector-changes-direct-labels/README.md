# Researcher sector-change labels

Runtime revision: `4f3de9b` (the subsequent evidence-only commit does not change runtime files).
Baseline: `fb77f9592459dc8d37a89f50608137cca0dc3b61`.

## Change

Destination names, percentages and exact counts sit directly below the corresponding bar segments. The first two labels start at their segment's left edge; the rightmost label ends at the bar's right edge. There are no connectors or detached color-key lists. The explanatory subtitle identifies first-paper cohorts, the first/latest publication-affiliation comparison and the within-origin changed-sector denominator.

The compact preview uses the same observations with wrapped names and 11px labels. At the narrowest rail sizes it scrolls internally rather than shrinking or overlapping labels. Source data, sector definitions and acquisition/refresh methods are unchanged.

## Evidence

These are real headed-Chrome captures from isolated production builds at `/neuro-atlas/field-velocity#researcher-sector-changes`, using a disposable loopback-only QA proxy. The proxy is excluded from this branch and was never pushed or deployed. This is not a successful authenticated hosted login claim.

- `before-1440.png` / `after-1440.png`: matched before/after desktop route.
- `after-390.png` / `after-390-right.png`: narrow modal; the full plot scrolls within its existing viewport.
- `preview-320.png`: narrow rail preview with internal horizontal scrolling.
- `export.png`: actual Download PNG button output, not a fabricated SVG or screenshot substitute. Its loopback footer identifies the QA origin.
- `geometry.json`: native 1440/390/320 source-mark and label geometry readbacks. Each detail plot has six labels and six exact source-valued segments. No document overflow; modal labels do not overlap or clip; compact label fonts remain 11px.

Focused publication tests, typecheck, changed-source lint and production build passed on the final source. The bounded full repository test replay passed; focused publication tests were repeated after the owner's final no-connectors/alignment refinement. Independent source review and final visual review are separate from native geometry assertions.

No merge, production deployment, authentication change or data-refresh change is included.
