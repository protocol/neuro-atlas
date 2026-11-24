# ExA-SPIM reference correction — November 23, 2026

## Scope and scientific contract

Correct the intended ExA-SPIM method citation to Glaser et al. (2025), *Expansion-assisted selective plane illumination microscopy for nanoscale imaging of centimeter-scale tissues*, eLife 12, RP91979, https://doi.org/10.7554/eLife.91979. Remove the obsolete HiExM/citation-mismatch warning from active chart, source inspection and exports.

The numerical source remains arXiv:2603.25713v1, Table A1, page 18. The chart keeps **2024**, **approximately 100 billion voxels/$**, and **author estimate**. The method paper is a separate supporting reference; it does not independently verify the specific throughput/cost assumptions. No scientific values, point IDs, method membership, fits, source archives, benchmarks, coordinates, URL behavior, auth, dependencies or production settings changed.

## Revision and stage

- Base: `56395db93182d41e61703a0bfbf89616f467bdbd`.
- Reviewed/runtime source: `7235d2860a64a91d32cbb4441018d1a57a6d1ec9`.
- Candidate captures: actual production build served on task-owned loopback `127.0.0.1:38623`, with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`; no auth replacement.
- Before captures: live canonical production on November 23, not a claim of independently pinned deployed source identity.
- Entry route: `/neuro-atlas/field-velocity#metric-panel-acquisition-economics`, the originally supplied legacy link.
- Evidence-only follow-up commits may package these files; manifest pins their runtime source. Local native PNG footer links correctly contain the local origin; these are not hosted captures.

## Verification

- 48/48 focused tests passed: citation/render/export, acquisition quantities and fits, benchmark motion/restoration, source provenance and source-context links. `focused-tests.log` is the actual receipt.
- Targeted ESLint, typecheck and production build passed. Build receipt in `production-build.log`.
- Independent bounded review of exact source versus base: PASS, no blocking findings. Reviewer independently verified all 260 numeric fields and complete acquisition fits are identical, complete evidence reconstructs the exact base when only the specified citation prose/metadata is reversed, and both historical JSON archives are byte-identical. No full-suite all-clear is claimed.
- Native browser: exact legacy fragment opens the correct chart at 1440px and 320px; ten plotted source observations remain, document bounds pass, corrected DOI occurs in the real source popup, obsolete warning is absent. At 320px, the popup scrolls; `after-reference-link-320.png` shows the actual Glaser link and full uncertainty note reached within it. Browser report records scope/links.
- Both `after-native-*.png` files were produced by the real Download PNG handler, capturing the actual Blob at the anchor boundary, then visually opened. Both retain the point key, author-estimate qualifier and prospective PEEM qualifier, without the obsolete warning.
- No merge or production deployment was performed.

## Baseline limitations, not introduced regressions

The wider reader-copy/source-directory/modal-title comparison has four failures on the candidate and the unchanged base: the pre-existing all-in-budget copy expectation, two old acquisition modal-title expectations, and an unrelated missing PMC1564115 source-directory entry. The new Glaser DOI is classified and resolves to the actual chart context. These are disclosed rather than weakening unrelated tests or claiming the entire suite is green.

The bounded reviewer suggested optionally asserting every allowed current prose field before the historical-golden normalization; focused tests already assert the decisive method/year/estimate/uncertainty wording. No observed runtime or scientific discrepancy was found.

## Evidence

- Desktop: `before-source-1440.png` / `after-source-1440.png`.
- Narrow source: `before-source-320.png` / `after-reference-link-320.png` (candidate scrolled to the method link).
- Default chart: `before-chart-1440.png` / `after-chart-1440.png`.
- Actual native PNGs: `after-native-voxels-per-dollar.png`, `after-native-dollars-per-voxel.png`.
- `manifest.json`: exact runtime/build identity and SHA256 for packaged inputs.
- `browser-replay.py`: executed replay, with explicit baseline/candidate origin and phase.
