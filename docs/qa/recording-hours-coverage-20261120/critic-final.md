PASS — F4 is closed on the exact reviewed revision; no new P0 in the fix.

# Neuro Atlas recording hours — final bounded re-review, round 2

**Reviewed SHA:** `664e4fb614faea1dee579142531e6efc39744509`, clean detached worktree `/opt/data/projects/neuro-atlas-hours-v3-critic-20261120`. `git diff --check` passed. The diff from `2bb8fb423771cd6bbdc3e8f89da58a7e8af2e314` is limited to the count validator, its display/bar call sites, and the targeted regression. No change to the 12 source rows, chart geometry, layout CSS, or rasterizer.

## Finding disposition

- **F4 — PASS / closed.** `src/data/recording-hours-coverage.ts:33–34,49–75` now exports the same positive safe-integer rule already used by averages and the contributor reference. `src/components/draft-chart-plot.tsx:75–81,166–173` applies it before formatting contributor/session counts and before creating a contributor fill. The resulting pair feeds the UI row, selected readout, accessible label, source table and export key (`:299,311–314,422,451,481`). Missing contributors remain undisclosed; invalid counts become unavailable without a numeric count, fill, or mean. Valid strict session qualifiers are still printed. Fractional recording hours still use the generic bar separately.
- **Regression evidence:** `tests/recording-hours-coverage-export.test.mjs:129–155` mounts the chart, injects 1.5 patients / 2.5 sessions into the 170 h TUSZ observation, and checks both the UI and the registered chart callback's serialized PNG raster input for absence of the invalid labels and contributor fill. `/opt/data/tmp/neuro-hours-feedback/f4-green.log:1–18` records 10 passed, zero failed. This is a mounted callback/serialized SVG regression, not a new native PNG download. An independent read-only Node probe on this SHA confirmed all 12 shipped rows have valid or missing counts, rejected null/undefined, zero, negative, fractional, non-finite, string and unsafe-integer counts, confirmed they yield no means and do not displace a valid 692-person reference, and confirmed a fractional hours bar and POYO's qualified average remain supported.
## Prior findings — unaffected by the bounded diff

- **F1 — closed.** Exact point-ID/badge mapping at all three widths remains supported by the v2 PNG/SVG ledger in `critic-rereview-v2.md:15`; the mapping code and all 12 source rows are unchanged.
- **F2 — closed.** Portal and table CSS remain unchanged. I opened the corrected 320 px pair in `/opt/data/tmp/neuro-hours-feedback/native-v2/`: `source-table-320-reset-left.png` shows the observation/date side; `source-table-320-scrolled-right.png` shows coverage and source notes after horizontal scroll. The files have distinct hashes. Exclude the older identical pair from final evidence.
- **F3 — closed.** The scoped header wrap and download handler are unchanged; see the v2 320 px control and download evidence in `critic-rereview-v2.md:17`.

**New P0s:** None. **Handoff evidence still due:** Parent's exact-v3 production build and nine-case native replay. The prior native downloads establish v2 behavior, not v3 asset or download verification. This verdict covers the bounded source fix; it is not hosted, merge, or production approval. No source or evidence was edited, and no browser, rebuild, broad suite, or worker was invoked in this review.
