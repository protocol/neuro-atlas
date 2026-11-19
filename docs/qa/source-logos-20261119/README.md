# Source-logo presentation evidence

Runtime revision: `dfeae2ef812aba89eebfdf9cc7cef5dd33b8c9d7`. Source baseline: `d4f5904bbeacbae717cb3e301038afce83af60ae` (merged sources/methodology page).

## Scope

Recognizable original logos in the six source-directory categories and beside recognized source links; Neurotech Futures and Neurofounders footer logos; shorter **Data & Methodology** footer heading. All 587 source hrefs/labels/categories and the original gathering/credit/contribution copy are unchanged. No graph migration, chart data, refresh, access, consent, or indexing policy changes.

New artwork provenance: `docs/source-logo-provenance.json`, with source pages, exact asset URLs, and original-byte SHA-256. Nineteen existing company logos and the two existing PL Neuro/Neurotech Futures marks are reused. The Neurofounders header wordmark is used rather than its partner-brain asset. Original white Cell Press artwork has a dark badge. Labels remain visible or available to assistive technology.

## Verification

- Production `/neuro-atlas`-prefixed build, typecheck, changed-file lint and root/prefixed affected tests passed.
- Independent review passed for the exact source revision: no material source-logo defect reproduced; independent root and prefixed suites each passed25cases.
- Actual Chrome replay at1440/768/390/320 in light/dark passed: all587 original href/label pairs, logo image loads, all six summary logo-click toggles, preserved Learn more/Feedback cancel/disclaimer, responsive navigation and existing chart modal. Source mark instances in rendered page: 238; images are local and decoded. Viewports are emulated; no physical-phone test or real Feedback submission.
- Served HTML matches the build (SHA-256 `890bf2ed5185ab9e43f472d1d0e58a90192c72974378e7e104b5acbb5ff4dcc8`); all45 referenced static/image assets match local bytes.
- The full concurrent suite was **not all green**:1500passed cases and one test-file process failure in unchanged `tests/performance-modal.test.mjs`. That test file and its actual component/data dependencies match baseline. Its isolated replay passed all6cases. The concurrent failure cause is unproven; the failed receipt is retained rather than relabeled. No modal/renderer implementation or tests were relaxed.

## Captures

These are actual **local production-build** captures; hosted preview and production verification are separate. Later evidence-only commits retain the exact runtime sources.

- `before-directory.png`: current deployed baseline before this change.
- `directory-1440-light.png`, `directory-1440-dark.png`: all six branded source categories.
- `directory-390-dark.png`: narrow wrapping and original-brand contrast.
- `papers-expanded.png`: publisher marks with unchanged research citations.
- `footer-1440-dark.png`, `footer-390-light.png`, `footer-320-dark.png`: source logos and shortened heading.
