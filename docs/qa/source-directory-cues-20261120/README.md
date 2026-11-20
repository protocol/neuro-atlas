# Methodology source cues and citation context — verification

Runtime reviewed and built: `39218e58ba0fef885c725df0e6f3b002b2e33334` (base `b6f99efaa80251c4fbbe608a329776617ae383ac`). Subsequent documentation, QA-script corrections, logs, and screenshots do not change runtime code.

## Requested behavior

- Every one of the six curated logo strips ends in a small `+ more` cue.
- Every original source link has either its retained real logo or a neutral, local, decorative link icon. All 587 source URL/label pairs and their categories/order are unchanged.
- `See in context` selects one supported on-site citation destination; `+ N more` counts other distinct destinations, not duplicated observations. Actual chart fragments and exact-source Milestones/Funding receivers are used. The latter display only matching canonical records before the unchanged timeline/dashboard.
- 358 catalog entries have a current supported context, including 56 with multiple destinations. The remaining 229 retained historical/research references are not assigned guessed destinations. The index follows committed/bundled data; later feed-only sources may not appear until a rebuild.

## Verified

- Frozen `npm ci` completed. No dependency or lockfile changes.
- Real prefixed production build (`NEXT_PUBLIC_BASE_PATH=/neuro-atlas`) and `npm run typecheck` passed.
- Changed-file ESLint and `git diff --check` passed.
- 70 affected/regression tests passed, including source inventory, exact URL identity, original href/label equivalence, logo/fallback coverage, context mapping/counts, both exact-source receivers, source-role/date precision, async route integration, Funding navigation/history, and root/prefixed URL behavior. Receipt: `focused-tests.log`.
- Independent isolated-code review at the runtime SHA: **PASS, no reproduced P0/P1**. The reviewer independently checked the 587/358/56/229 context inventory and ran 32 focused tests. Its two documentation discrepancies were corrected. The independent pass did not claim native visual acceptance.
- Actual headed Chrome on the exact production build passed at 1440/light, 768/dark, 390/light, and 320/dark: all original source pairs, all six native summary toggles, no horizontal overflow, expected context/multiple counts, and decoded logo-strip images. `browser-results.json` records the native route actions.
- Native `See in context` activation opened the Bock mouse V1 tissue-volume chart with its actual Cell Image Library citation, a Precision Neuroscience milestone block with its original FDA source, and an Axoft company-website block in Funding. Additional 320px checks passed for the Blackrock $200m investment's real round evidence and the Penumbra acquisition-announcement milestone, preserving their qualifications. These are emulated viewports, not physical-phone testing.
- Existing data, route/redirect configuration, canonical links, public assets, auth/indexability and Feedback implementation are unchanged. There is no merge or production release in this work.

## Broader-suite limit

Two full-suite attempts (file concurrency 2, then 8) were interrupted after prolonged execution in unrelated chart/feedback test processes. Neither produced a terminal suite result. Termination produces runner cancellation errors, which are not a discovered assertion failure. The cause was not established and **the full suite is not claimed green**. The final affected 70-test replay completed successfully. No unrelated test or chart implementation was weakened to hide this limitation.

## Captures

All screenshots are local exact-production-build captures, not claims about production deployment. Hosted-preview evidence is recorded separately in the PR.

- `directory-1440-light.png`: all six strips and `+ more` cues.
- `directory-768-dark.png`, `directory-390-light.png`, `directory-320-dark.png`: responsive strip wrapping.
- `reference-320-dark.png`: fallback icons, real logos, context actions and a multiple-context count.
- `native-chart-context.png`, `native-milestones-context.png`, `native-funding-context.png`: real pointer-activated destinations.
- `funding-round-320-dark.png`, `milestone-event-320-dark.png`: narrow receiving-record context.
