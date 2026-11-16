# BCI speech entropy revision — November 16, 2026

## Result and scope

The five speech estimates use 1 assumed bit/character and five assumed characters/word, including spaces. Each speech inspection links the exact Stanford **Entropy and Redundancy in English** article as its calculation reference and retains its study link as native-rate provenance. This is a context-dependent English-information approximation.

Handwriting remains exactly 7.211032383086406 bits/s (`90 × log2(28) / 60`). The other eight non-speech rates, all native selections/errors/assistance, 14 reference-year placements, IDs and fit-inclusion flags are unchanged. The existing nine-estimate descriptive log10 fit is recalculated: intercept −0.4866672281088875 at 2015; slope 0.13216395418956403/year; R² 0.6581006670862894. The five native/image context marks stay excluded. Active copy distinguishes the speech and non-speech conversion conventions.

## Revision identity

- Model/data/method source commit: `994069a72034c01d0dcb058c1097ddf077d810d8`.
- Runtime and native-capture commit: `d2bf9f2d9b09c798c51236a83257afd8e3d4903b` (pins the method link to the source commit).
- Final evidence-only PR commit: read the current PR head. It preserves the reviewed runtime/data bytes.
- Existing repository/PR: `protocol/neuro-atlas`, #112, branch `feat/bci-bitrate-scaling-20261115`.

Native screenshots and images are **local loopback QA**, from an opt-in, Host-restricted, noindex disposable fixture. The hosted gate remains intact; positive hosted login acceptance is separately unverified. No merge, production publication, author outreach or monitoring was performed.

## Evidence

- `bci-bitrate-native-export.png`: actual Download PNG,2400×2232; 14 concise study keys below branding, explicit speech 1 bit/char × 5 char/word and retained 28-symbol convention, mixed-model/R² key.
- `bci-bitrate-native-clipboard.png`, `clipboard.json`: actual native clipboard PNG with HTML/plaintext; independent review confirms download/clipboard RGBA pixel parity.
- `chart-desktop.png`, `chart-390.png`, `chart-320.png`: actual responsive route at 1440/390/320px.
- `speech-source-390.png` and `stanford-reference-390.png`: the same native speech inspection before/after internal scrolling; retained study link and separately visible Stanford calculation source. `fit-and-methods-390.png` shows the lower mixed-model/R²link key.
- `native-qa.json`, `compact-export-state.json`, `stanford-link-visible.json`, `native-qa.py`: real source inspections, fourteen mark/row/key identities, layout bounds, source links, copy/download and focus/history receipts.
- `model.before.json`, `model.after.json`, `parent-verification.json`, `preserved-before.json`: exact source/native/model reconciliation and protected-file hashes. `parent-sensitivity-preflight.json` records targeted information-weight and word-length probes.
- `asset-parity.json`: 16 actual served JS/CSS/font assets match the isolated build, with runtime/build identity.
- `static-scan.json`, `full-review-diff.patch`, `independent-review-verification.json`, `independent-artifact-verification.json`, `review-closure.md`: complete independent source/artifact review and F1packaging closure.
- `cleanup.json`, `tab-cleanup.json`: task server 37312 closed, owned tab closed, 3 preexisting tabs preserved and browser hold released.

## Executed checks

- Five distinct RED→GREEN seams: speech model/preservation, separate Stanford reference, replay sensitivity, explicit per-row CSV model, and active copy/native export. Final receipts supersede earlier failed attempts.
- Final parent affected cohort: **60/60 passed**, 0 failed, 0 cancelled. Independent critic fresh replay: **60/60 passed**,exit0. Earlier worker BCI-only cohort: 37/37. Logs retained.
- Parent independent arithmetic: all 14 app/CSV/replay rates and 9 point OLS agree within absolute 1e-12. All 9 non-speech rates and 14 native inputs/tasks/errors/assistance/statistics/source metadata/year/fit flags remain unchanged.
- TypeScript and scoped ESLint passed; source and isolated fixture production builds both exited0 at the reviewed runtime. The method-pin commit changes only the method URL.
- Real desktop/390/320 browser replay passed, including 5 speech study+Stanford link pairs at each width, unchanged handwriting 7.21, all 14 marks/rows/keys, five-year ticks, visible/current R², native copy-link readback, clipboard PNG and real Download PNG.
- Seven protected files byte-match baseline: source/candidate ledgers, frozen acceptance inventory, production proxy, renderer, exporter and chart types. Full 256-added-line static scan passed after F1 closure.

## Broader regression boundary

Both full runs used `env -u NEXT_PUBLIC_BASE_PATH node --import tsx --test --test-concurrency=4 --test-timeout=60000 tests/*.test.mjs` under a 240-second bound:

- Exact baseline `a71c1d7`:928 tests; 848 passed, 10 failed, 70 cancelled; exit 124.
- Exact runtime candidate `d2bf9f2`:921 tests; 838 passed, 9 failed, 74 cancelled; exit 124.

Neither is a completed green aggregate. `broad-reconciliation.json` retains exact shared failing/cancelled case headers without treating every failure as baseline or inferring a root cause. An earlier expanded affected run hit its 120-second bound:74 passed, 0 failed, 2 cancelled. Its all 15 curated-images sharing test also timed out in the baseline. The 60-check focused pass and actual native acceptance are separate completed evidence; this handoff makes no general application-readiness claim.

## Independent review

Independent critic **PASS**, no P0/P1 source/calculation/provenance/native-image defect, on exact runtime `d2bf9f2d9b09c798c51236a83257afd8e3d4903b`. Reviewer independently read the complete Git delta, recomputed model/fit/replay, ran 60 focused checks and visually inspected all native evidence.

F1 (P2) identified a truncated review-packet diff and partial scan. The reviewer recovered and reviewed the full delta; the parent regenerated it directly from Git and confirmed matching full SHA-256, 79483 bytes and 256 added lines, then rescanned. The full-scope scan and `review-closure.md` explicitly supersede the partial 201-line scan. Source and artifacts were unchanged. Candidate broad results became available after the review and are disclosed above; the review did not claim to have inspected that later aggregate. Final remote publication is verified separately at PR handoff.

Production auth, renderer and export implementations; historical source/candidate ledgers; and `docs/qa/chart-legibility-20261112/acceptance-inventory.json` are byte-identical to the prior PR head. Exact hashes and source/native/CSV reconciliation are recorded in the evidence. No dependency/configuration changes were made.
