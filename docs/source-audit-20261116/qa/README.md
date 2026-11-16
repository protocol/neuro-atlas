# Native evidence — Neuro Atlas source corrections

**Runtime under test:** `e55dd2e25b5484ae4c508a7316b563a9a061ecf9`.

These are actual Next production-built components and canonical/generated data, served through a task-owned, Host-restricted, noindex, loopback-only static fixture. They are **not screenshots of the hosted preview** and do not establish hosted authentication, feedback/API behavior, navigation outside the two replayed pages, or physical-phone touch behavior. Viewports use native pointer input at 1440, 390 and 320 CSS pixels.

## Passed native checks

- `browser-results.json`: 33 scenarios across the three widths: complete per-year timeline source-link inventories; corrected Envoy, Synchron, Phantom, INBRAIN, Forest and Precision details; Neuracle, Forest, NeuroXess and NeuroBionics company histories; exact backer paragraphs and source links; dialog Escape; NTI normalization; tooltip/dialog bounds.
- `supplemental-results.json`: nine additional CONVOY/Echo/CorTec closure checks, plus all **90 resting source marks at each of the three widths** (270 checks). Each source mark is measured, scrolled into view and center-hit-tested while the prior hover is dismissed. CONVOY's actual detail is generic feasibility, Echo keeps its approximation marker, and CorTec's actual IDE card says the date is unverified.
- `runtime-assets.json`: both served page HTML files and all 16 referenced static assets were compared byte-for-byte with this exact production build (18 checks). The build worktree was clean at the pinned runtime SHA.
- `screenshot-manifest.json`: hashes and sizes for all 14 PNG captures. The PR embeds selected desktop/mobile images; the remaining captures remain here.
- `scope-verification.json`: exact 34-group inventory/disposition reconciliation, 146 date-ledger records, source-data hashes and retained roster/event counts.
- `review-verdict.json`: completed independent bounded review after the initial code/source findings were fixed. Its mounted JSDOM probes are a separate evidence class from these headed-Chrome captures.

## Replay history

The first automation attempt did not reach completion when a prior expanded hover capsule covered a neighboring target. The helper now clears the old hover and hit-tests the resting target before moving the pointer. A separate early year-focus click did not change the selected year; its transient input cause is unconfirmed. Final replay explicitly foregrounded the task tab, waited for the client-only readiness marker/fonts, remeasured targets and used the supported native-click diagnostics. Both final replay receipts above passed; the unsuccessful attempts are retained separately and are not relabeled passing runs. No product authentication or access setting was weakened for QA.

Final test/build/lint qualifications and the PR handoff are recorded in the parent verification report. These native receipts do not resolve inaccessible source bodies or legacy FX provenance.
