PASS — The actual download and clipboard PNGs fix the note-heavy layout without changing the approved chart; this is a presentation verdict, not release clearance.

## Review basis

One independent, bounded artifact hunt. Reviewed detached source checkout `/opt/data/tmp/atlas-bitrate-clean-export-critic-20261116` at `80a14e610f331b6b0cbd37a4f14d1893950be7d1`, including the exact six-file delta from `cfc8c943cc190cac64bf353e9df1fc7a16b2f5d4`. Checkout remained clean after verification. No delegation, source edits, browser-setting changes, or external messages.

The bar is Lukas's “please fix the note-heavy layout!” in `critic-bar.md:3`, not an owner-approved mockup. The two-column key below branding is the builder's implementation choice (`critic-bar.md:5`). The selected uniform conversion is fixed scope, not reopened here.

Evidence paths below are relative to `/opt/data/tmp/atlas-bitrate-20261116/clean-export/` unless otherwise stated.

## Material defects

None found within this presentation correction. No P0/P1 finding or blocking fix.

Applicable hard gates:

- PASS — Actual requested outputs inspected separately. Vision opened `native/bci-bitrate-native-export.png` and `native/bci-bitrate-native-clipboard.png`; both decode to 2400×2186. Each visibly contains the chart, five task-group legend entries, nine-point fit/R², branding, direct link, and the complete two-column study key. No claim of pixel identity between the two outputs.
- PASS — Note-heavy layout removed. Against the prior actual PNG at `/opt/data/tmp/atlas-bitrate-20261116/uniform/final-native/bci-bitrate-native-export.png`, long conversion/assistance paragraphs no longer sit between plot and footer. The old 2400×2974 image becomes 788 pixels, or 26.5%, shorter. The replacement is seven short key rows, not a reformatted prose footnote.
- PASS — Branding-safe crop. `native/native-export.svg` declares `data-export-crop-bottom="785"`; `native/compact-export-state.json:4–5` places the logo bottom at 768.149 canonical units. Both PNGs visibly leave a clear gap before the study-key heading. Cropping at 1570 raster pixels retains the logo, information line, direct link, plot, legend, and R² while removing the study key.
- PASS — No missing marks or key entries. The actual SVG contains 14 source-observation marks and 14 dedicated key entries. `native/compact-export-state.json:6–160` maps all numbered identities into two columns; measured text starts at x=74/642, maximum right edge is 997.610 within a 1200-wide image, and maximum bottom is 1047.600 within height 1093. Vision confirms no clipped or overlapping key rows in either PNG.
- PASS — Compact labels retain the necessary interpretation. The key heading says “reference years · bits/s” and “Text equivalents: PL R&D estimates; context not fitted.” Entries distinguish `equiv.`, `image est.`, `native`, `native est.`, and `company`; entry 2 remains unconfirmed, entry 6 retains T5 9×9, and entry 8 retains P2 isolated. The fit legend visibly states “9 text-equivalent points · R²(log10) = 0.847.” These are not relabeled measured equivalents or an all-point fit.
- PASS — Scientific values and on-site evidence preserved. Independently compared `model.before.json` with `model.after.json`: exact equality after deleting only the 14 `plot.points[*].exportAnnotation` fields and `plot.exportPointKeyNote`. All other model content, rows, fit, source notes, and links reconcile. Independently matched all five entries in `preserved-hashes.json` against this checkout: source JSON, candidate JSON, historical acceptance inventory, provenance CSV, and auth proxy.
- PASS — Native desktop/mobile presentation. Vision inspected `native/chart-desktop.png`, `native/chart-390.png`, and `native/chart-320.png`. Controls remain usable-looking and bounded; at 320px Download PNG wraps onto its own row without collision. Plot labels and five-year ticks remain readable. Dense on-site annotations remain deliberately on site, not in the exported image. `native/native-qa.json` records 14 marks, 14 table rows, six year ticks and source-inspection/navigation checks at all three widths; mobile document and dialog widths do not horizontally overflow. Desktop's recorded 10px dialog overhang corresponds to the inherited close control, not clipped chart content (`native-qa.py:94–95`).
- PASS — Focused regression/safety evidence. Independently ran `env -u NEXT_PUBLIC_BASE_PATH node --import tsx --test tests/bci-bitrate-clean-export.test.mjs tests/bci-bitrate-integration.test.mjs tests/chart-export.test.mjs` in the exact checkout: 22 passed, zero failed/cancelled/skipped. This exercises the actual export callback, key separation, inert SVG, safe bounds, source nonmutation and non-keyed export contracts. In `src/lib/chart-export.ts:236–280`, marker geometry remains equivalent, new key text is escaped, and appendix rendering is conditional on a nonempty point key. No material defect found in the artifact-relevant delta; this does not replace the separate code review.

## Assumptions and evidence gaps

- Reasonable, untested preference assumption: a concise study-identification appendix meets Lukas's request better than deleting study identities entirely. The rendered result supports that choice; his approval of this exact mockup is not asserted.
- Release evidence remains separate. `source-build.log` records the earlier source production build; the runtime delta from `050255b` to the reviewed revision is empty. `fixture-final-build.log` and `asset-parity.json:2–6` support exact-revision local replay, with 12 asset records matching the declared count. This is loopback QA, not hosted-production evidence; its localhost footer is expected.
- At the last inspected snapshot, `full-tests-unprefixed.log` had no terminal aggregate. The correct-environment full suite is not declared green. The earlier misconfigured run and obsolete callback expectation are not an all-green suite. The parent must join its actual rerun and separate code review before release.

## Downside and failure map

- Likely, low-impact: a small pasted image can make abbreviated key text hard to read. The full-resolution PNG and direct site link provide the intended detail path; restoring long methods would recreate the original problem.
- Possible, moderate-impact: manually cropping away the appendix removes numbered study identities. This is the requested layout tradeoff, not a claim that the cropped chart is self-contained provenance. Keep the full image when study-level attribution matters.
- Possible, moderate-impact: a release summary could overextend this PASS into production/authentication or full-suite approval. The parent owns that risk; neither is established by these local pixels.
- Stop/review again only if an affected revision changes plotted values, loses key qualifiers or branding, introduces clipping, or produces a relevant failing release dependency. No such presentation failure appears in the reviewed artifacts.

## Better way

Keep this bounded presentation fix. The simpler path is exactly the implemented separation: plot and compact series legend, then branding/referral, then concise study identities. Keep methods on site. No new data method, export mode, or process is warranted.

## Brevity and structure cuts

No required further cut. Do not restore repeated formulas, assistance/error paragraphs, or per-row fit-status prose to these PNGs. The shared key heading already carries units, date basis, estimate attribution, and context exclusion once.

## Prioritized fix queue

None for this artifact revision. Parent-owned release joins remain dependencies, not invented layout findings.

## Residual risk and dissent ledger

The strongest objection is that the full image still includes 14 study labels. It does, but they are now short identity/value rows below the completed branded chart, not the previous wall of methods; this objection does not survive as a material layout defect.

The other objection is that compression drops scientific detail from the standalone PNG. That tradeoff survives as a limitation, not a blocker: decisive evidence categories and selected conditions remain visible, while unchanged full notes and source links remain on site. No unresolved material presentation defect remains.

Artifact identity: download SHA-256 `d41308e093d868a7f58131849cee3ca3975338c5e73b70cc414102b2a2c823b7`; clipboard SHA-256 `9f23d7cfd64cbcb36ea625446cde3979287150bedcfbb16728d3d3f959083b4b`.

## Bounded same-revision closure

PASS — The corrected PNG and verified PR112 handoff can proceed with an explicit broad-suite limitation; neither merge nor production clearance is granted.

This closes only the prior dependency ledger, not a new hunt. The original review had no material finding IDs. Exact HEAD remains `80a14e610f331b6b0cbd37a4f14d1893950be7d1`, the checkout is clean, and both PNG hashes above were rechecked unchanged.

- Separate code review: `code-review.json:2–10` records PASS, empty security/logic findings, and optional coverage suggestions. No blocker retained.
- Relevant verification: `final-scoped.log:57–64` records 56 passed, zero failed/cancelled/skipped. All ten reconciliation entries in `test-reconciliation.json:15–65` have their passing case present in that actual log. This resolves the nine inherited-base-path expectation failures and the obsolete BCI key assertion; it does not erase the initial broad result of 1307 total / 1297 passed / 10 failed (`full-tests.log`, terminal aggregate; `test-reconciliation.json:5–9`).
- Shared-default regression risk: `default-parity.json:1` records 42 byte-identical default ChartImage comparisons between the exact baseline and reviewed head. Together with the retained native output, scientific-model invariance and focused tests, this directly supports the unchanged non-keyed export path.
- Important qualification: the correct-environment broad attempt was not merely missing a green summary. Although its process hit the reported 600-second limit/exit124 (`test-reconciliation.json:10–14`), `full-tests-unprefixed.log:1265–1272` records 1237 tests / 1223 passed / 2 failed / 12 cancelled. It names `performance-modal.test.mjs` as failed (`1276–1278`) and a real recording-history assertion mismatch, optical versus human-channels (`1284–1300`). The latter passed in the earlier completed run (`full-tests.log:1242`). These outcomes are not reconciled by the ten-original-failure map, and are not proven harmless or caused by timeout.

Judgment: that incomplete, partially failing broad attempt is an honest residual verification limit, not a material blocker to this narrow PR/PNG handoff. The observed history/modal failures do not establish a regression in this presentation-only delta; default exporter invariance and unchanged scientific/native evidence address its actual blast radius. Do not describe the full suite as green, the failures as all resolved, or this verdict as general application readiness. No actual product requirement is waived, and the existing small-image/cropped-key limitations remain unchanged.
