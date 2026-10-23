# Measurement chart review — native browser acceptance

Runtime source: `84476107b0fa1614df826aaed89f4202b4734795`.

- 277 tests, typecheck, changed-file ESLint and production build passed.
- 33 native browser cases passed: seven changed/new plot panels and four legacy/canonical alias entries at 1440/390/320px.
- 85 exact observation identities rendered, all 12 combined split/merge glyphs (4 circles, 5 squares, 3 triangles) inspectable by keyboard; source/regression tests preserve all 79 old identities and source values except the explicitly tested acquisition reciprocal.
- 11 served static assets matched the pinned disposable build byte-for-byte.
- Production auth, dependencies and provider snapshots unchanged. Local fixture's proxy passthrough exists only in a disposable worktree, bound to 127.0.0.1, never committed/deployed.
- Screenshots are actual browser viewport captures. Narrow widths are desktop emulation, not physical-phone touch acceptance. This is not authenticated hosted-preview evidence.

Replay `scripts/qa/chart-review-browser.py` through the owned browser-harness window with `ATLAS_REVIEW_URL`, `ATLAS_REVIEW_OUT`, `ATLAS_REVIEW_DATA` and `ATLAS_REVIEW_SHA` set explicitly. It reads the real component data, checks plotted marks, focus/keyboard inspection, aliases and document bounds. Do not use the legacy standalone Draft-tab replay.

Prior tests initially identified expected old-inventory assertions and legend-glyph counting assumptions. The count probe now counts `svg.draft-plot-svg`, not decorative legend SVGs; the preservation gate freezes the independent pre-review 79-row fixture rather than weakening data protection. One prior full-suite run hit the existing related-link history timing assertion under concurrent build load; the final full suite passed unchanged.

Native Google Slides verification, comment IDs and private reply drafts stay outside this public repository. Deck narrative cuts preserve underlying research observations here.
