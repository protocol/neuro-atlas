# Publication growth — reference-layout cleanup

## Scope

The `#publication-growth` chart now uses horizontal zero-to-dot lollipops with percentages beside their endpoints. The default shows the gray four-domain all-science context band and a dashed all-neurotech total-growth line. Nine calculated same-category comparisons are available through an off-by-default checkbox; twelve category-specific references remain unavailable. All 21 numerator rows and original values are retained.

The total is calculated from the NT10 annual counts (9,726 in 2022 and 16,057 in 2025), not by averaging subgroup rates. The gray range is independently acquired global context; category numerator universes and count units still vary. Detailed counting/provenance is unchanged. The growth source JSON now also includes `nt_yearly`, so the restored band and aggregate can be reproduced from the download.

No primary data, acquisition code, method contract, feed, authentication, public routing or unrelated chart renderer changes are included.

## Evidence identity

- Before: `fb77f9592459dc8d37a89f50608137cca0dc3b61`.
- After: runtime `85e523e09b15c23bb7b66067b2488c8e3fe2a431`.
- Images are actual headed-Chrome captures of isolated local production builds, with a disposable loopback-only QA proxy. The listener was bound to `127.0.0.1`, required an explicit QA flag and rejected a non-loopback Host with HTTP 403. The QA proxy is not committed or deployed.
- Hosted absent-password checks still return HTTP 401/noindex. Local positive UI evidence is not a successful hosted-password sign-in claim.

## Native checks

`native-report.json` records actual 1440×1000, 390×844 and 320×844 cases:

- Exact 21-row equality with the primary snapshot; source-derived gray range and aggregate checked independently from annual source counts.
- Horizontal stems, endpoint-adjacent percentages, readable effective fonts and in-view SVG text bounds.
- Sticky axis geometry at the top, middle and bottom of the chart; aligned axis/plot coordinates during local horizontal scrolling; numeric scale visible initially.
- Real wheel scrolling, optional nine-reference/twelve-unavailable mode, exact restoration and complete immutable source JSON.
- Initially empty inspection, keyboard point selection, Escape, actual trigger opening, browser Back/Forward and focus return.
- No document-level horizontal overflow.

At narrow widths the full plot deliberately scrolls horizontally inside the dialog. `after-mobile-initial.png` and `after-mobile-scrolled.png` show both states; the entire plot is not squeezed into unreadably small labels.

The full SVG retains its own axis for image export. An aria-hidden sticky copy overlaps that axis at the scroll bottom, rather than showing two axes, and is not part of the exported SVG. Percentage labels have a background halo so grid/benchmark lines do not pass through their text.

## Export checks

`export-report.json` records two actual native Download PNG runs: default and optional-comparison modes. The page-local anchor transfer was intercepted to avoid changing the shared Chrome download destination. Both files have valid decoded PNG dimensions and include the complete chart, axis and source-qualified notes; this is not a receiving-editor clipboard-paste claim.

- `growth-default-export.png`
- `growth-alternatives-export.png`

## Automated checks

The focused publication UI/legend suite passes 19 tests, including source-reproducible context, horizontal marks, endpoint labels, zero/absent denominators, opt-in alternatives, sticky/export axes, viewport reservation, stable links, inspection and PNG legend requests. Changed-component ESLint and `git diff --check` pass. Full-suite/typecheck/build receipts are reported separately in the PR after their final run.
