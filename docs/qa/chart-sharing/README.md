# Chart sharing verification — October 29, 2026

## Revision and scope

Native screenshots and clipboard receipts in this directory were captured from runtime commit `a909d33bbb9fd235e833121dd67c2cac95764c1c`, based on `d7790482c0ffff33220912df98b8aafdb147b58f`.

The application was built in an isolated checkout with `/neuro-atlas` as its base path and served on loopback only. Its disposable proxy substituted a loopback-only QA guard; the release branch's production authentication file is unchanged. No fixture proxy is committed. These are local UI/export checks, not authenticated hosted acceptance or a production deployment. Sample image footers intentionally show the loopback origin used for capture.

The subsequent evidence-only commit adds this directory; its runtime, tests, dependencies, assets and authentication must remain byte-identical to the runtime commit. The before/after asset manifests independently verify the nine served JS/CSS assets remained unchanged throughout the replay.

## Verified behavior

- Native Copy chart actions for all 25 numeric panels. Each clipboard read contained a decodable PNG, the exact per-panel plain-text link, and HTML containing the image and link. `clipboard-results.json` records dimensions, byte counts and hashes.
- Initial point-details box is literally empty. Desktop hover and 390/320px pointer activation populate the selected observation. Native keyboard Enter/Escape behavior works. `interaction-results.json` records each viewport; responsive pointer tests are not physical-phone touch tests.
- Desktop and narrow-screen action bounds; dark-mode 320px export; full SVG export rather than the clipped mobile viewport.
- Fresh neuron/hours modal links, optional extrapolation, selected scenario and visible qualifications retained in the image.
- Denied image-write permission reports failure without overwriting a sentinel clipboard value. Download PNG succeeds as a separate native action. Scoped clipboard permissions and browser download behavior were restored.
- Actual final PNG inspection confirmed observation-level bounds remain visible, including POYO's >100 hours and autoTEM's >0.0028 mm³/day. The meaningful qualifiers and source context remain after removing the generic “Bounded evidence” eyebrow.

`desktop-empty.png` shows the initial inspector; `desktop-hover.png` shows its populated state. `mobile-empty.png` is scrolled to the narrow-screen actions and empty inspector. `copied-chart.png` and `qualified-chart.png` are actual native clipboard PNGs, not source-rendered substitutes.

## Automated checks and review

At the runtime commit: full `npm test` (332 passed, zero failed), `npm run typecheck`, and `npm run build` passed. Independent source review closed both located findings: missing visible observation qualifiers and the exact nonvisual export metadata's interaction with existing SVG-hash tests. Original golden hashes are retained; only the literal added `data-export-r="5"` attribute is excluded from that comparison. Final native verification above followed the qualifier fix.

## Receiving-editor limitation

A separate synthetic native Ctrl+V probe in LinkedIn's blank composer pasted only the URL for mixed image/text formats. A PNG-only trusted paste event delivered an image file but did not produce an attachment. The test draft was cleared and dismissed; nothing was posted. X did not yield a signed-in composer and remains unverified. Private account screenshots are deliberately excluded from this repository.

Therefore Copy chart supplies image/link formats best-effort; it does not promise that X or LinkedIn pastes both. Download PNG plus Copy link is the explicit fallback. The link identifies the panel, while the PNG preserves its currently selected track/scenario.
