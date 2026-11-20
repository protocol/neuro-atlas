# Recording hours: participant breadth, relative bars, and calculated averages

Historical initial implementation evidence. The current one-decimal/minute-format and direct-bar-label correction is verified in [the readability QA package](../recording-hours-readability-20261120/README.md).

Runtime verified: `664e4fb614faea1dee579142531e6efc39744509` (November 20, 2026).

This is PR evidence, not a production release. Native screenshots and downloads came from an isolated production build at loopback `/neuro-atlas/field-velocity#metric-recording-hours` through the existing headed Chrome. Mobile widths are viewport emulation, not physical-phone touch tests. `before-1440.png` is the production baseline inspected before implementation; other main chart, comparison, table and export images are from the final runtime above. The two supplementary 320px table-position screenshots, row activation and settled preview-parity receipts are retained from `2bb8fb4`; the count-validation fix did not alter layout or any of the 12 shipped values.

## Checked

- Original twelve observations, coordinates, checkpoint dates and greater-than qualifiers retained; release-specific contributor/session counts matched to primary evidence. No pooled total, new dataset inventory, or quality ranking. See `../../recording-hours-coverage.md` and `source-review.md`.
- Nine final native cases pass: three layouts (1440/390/320), three actual native PNG downloads, and three legacy deep-link entries. The runner checks all 12 paired values, all proportional bar fills, lower-bound arrows, derived means, unknown contributor counts, accessible marks, source rows and selected-point text. See `native-results.json`.
- Actual downloaded images were opened and inspected, not substituted with a screenshot of the page. The native-export SVG files are the precise raster inputs. Dynamic overlap badges match their exact source-point IDs in the visible key at each width.
- Final production build including TypeScript passes (`build.log`). HTTP 200 and all nine served script assets match the same build (`served-assets.json`). No dependency, routing, auth or indexing changes.
- Ten coverage/count-validation tests pass on the final runtime, including a RED→GREEN mounted fractional-count UI/PNG regression (`count-validation-tests.log`). Generic fractional hours remain valid, but invalid contributor/session counts cannot become labels, means or contributor bars.
- Eleven focused coverage/export/sharing tests passed before the narrow validator fix (`focused-tests.log`); the changed coverage tests were rerun afterward. Twenty methodology/source-directory checks passed; the source-inventory failure was corrected by cataloging the four new URLs. The previously failing qualified-measurement association test was corrected to distinguish the measurement from its new context and passed (`qualified-export-test.log`).
- Independent source audit passed. Independent render/code review closed F1 (PNG badge map), F2 (portaled table), F3 (320px controls), and finally F4 (invalid count display/fill). Final source verdict: PASS (`critic-final.md`). Its stated pending build/native gates were subsequently completed by the final-runtime receipts here.

## Full-suite qualification

An earlier complete suite at `2362021` returned 1,509 passed / 2 failed. Those were the new source URLs missing from the directory and the old association test treating the entire expanded value cell as one measurement. Both were fixed and replayed green. The entire broad suite was **not** rerun after the bars/averages and count-validation refinements; do not call this a final full-suite green result. Installed dependencies were reused unchanged; no fresh `npm ci` is claimed.

## Evidence and authority

`hashes.json` inventories the evidence bytes. `build.log` normalizes only terminal carriage returns/trailing whitespace for repository readability; the raw tool log is retained in the private task records. The PNG footer contains the loopback origin because this is local native-export evidence, not a hosted image. A final evidence-only commit can follow the runtime SHA; verify its runtime/test delta is empty. The PR's interactive preview is separate hosted evidence and must use the edited route, not its deployment homepage. No merge, production promotion, new access grant or monitoring job is authorized.
