# PR #101 — neuron-count chart only

## Accepted scope

Lukas’s November 12 screenshot names **Selected published connectomes — neuron counts**. Retained: mouse ≈70.9M, rhesus macaque ≈6.38B, human ≈86.1B anatomical references, separate primary-source disclosure, and this chart’s exported observation/date key. The five existing plotted observations and their exact scientific scope remain unchanged.

All other original PR proposals are reverted to base `05a314c3889836230d179d7bb5b1f626b6804193`: financing circles, cost scenarios/evidence, byte-resource additions, publication context, cross-chart links, global export changes, and their unrelated documentation/tests/screenshots.

## Verification

- **1,143 tests passed**, zero failures, cancellations or skips (`node --import tsx --test --test-concurrency=4 tests/*.test.mjs`).
- Standard production build, typecheck, changed-source ESLint and diff checks passed.
- All 13 other curated numeric previews/details are byte-identical to the base. Independent review checked 78 rendered markup cases: only this metric chart’s preview/detail changed; 14 of 15 serialized exports are identical, with only this chart’s export changed.
- Actual headed-browser checks at 1440, 390 and 320px: five observations, three references, no document overflow, source disclosure with three links. Viewport-emulated pointer coverage, not physical-phone touch.
- Real **Download PNG** click, emitted PNG reopened. The chart and all observation/date keys are pixel-identical to the owner’s supplied PNG; the sole pixel difference is the local footer’s capture-origin port.
- Independent scope/security/logic/visual review passed after its one stale scientific-golden finding was resolved. The original archive/source/scientific goldens remain unchanged; normalization removes only this chart’s added reference metadata and asserts no reference metadata on unrelated plots. Final full suite passed after that narrow test fix.
- Source archive, dependencies, auth gate, hosting configuration, financing and publication components have no net diff from the base.

## Evidence boundary

Screenshots and native PNG below come from runtime `5c0b4db32b73738299e516c5ae10ab9e0d18e766` built in a disposable loopback-only production fixture. Its explicit environment flag, raw-Host restriction and noindex stay outside the PR. Subsequent commits change only tests and evidence; runtime/asset parity was asserted. The PNG footer honestly identifies the local origin. This is not a production release, a successful hosted-login test, or a physical-phone test.

`browser-receipt.json`, `scope-equivalence.json`, `verification.json` and `artifacts.json` hold the checks and artifact hashes. `neuron-count-1440.png` and `neuron-count-320.png` are real browser captures; `neuron-count-native-export.png` is the actual app-produced PNG.
