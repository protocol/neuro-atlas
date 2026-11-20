# Chart-toggle URL verification — 2026-11-20

## Scope

The two chart switches currently mounted by the Field velocity page now update its URL:

| Chart | Enabled-state query |
| --- | --- |
| Selected public image/resource footprints | `brainScale=public-data-size` |
| Estimated acquisition efficiency — voxels per dollar | `brainScale=acquisition-economics` |

Switching off removes the parameter. Existing fragments and aliases retain their identity; no path or fragment migration is introduced. Query values are chart-scoped and duplicate/unknown values fail closed. Unrelated repeated query entries and router state remain intact. The existing legacy/component-only recording-hours extrapolation path also uses `extrapolation=neural-recording-hours`; no new visible control was added to the current page.

## Evidence

Runtime under test: `8f87454bc1457ac89a44de784b4dd1d032dcad07`. Screenshots are actual **local production-build Chrome captures**, not production-site screenshots. Subsequent evidence/test-only edits do not change runtime, data, dependencies, or configuration. Independent review compared exact runtime hashes with the build snapshot; all matched.

- Live baseline reproduced: native Whole-brain scale click enabled the chart and its three model references while leaving the address unchanged.
- Test-first RED→GREEN captured for benchmark URL changes, chart isolation, extrapolation component support, and sanitized export URLs.
- 26 new URL/history/sharing regressions passed.
- 27 related geometry, motion, export, and recording regressions passed.
- Independent code/security critique: PASS; no security or logic findings. Its two nonblocking test suggestions were incorporated: all-switch history/alias/copy/close coverage, and complete URL equality after removing only the new state token.
- The strengthened export-origin/base-path assertions were replayed independently: 2 passed.
- Type generation, direct `tsc --noEmit`, changed-file ESLint, and Next.js 16.4.6 production build passed.
- Actual Chrome acceptance: both live switches at **1440, 390, and 320 CSS px**, plus a native open→toggle→Back→Forward→Close journey (7 recorded cases). Verified address on/off, native copied clipboard value, reload, fresh copied-link restoration, repeated query retention, unchanged source-table text, keyboard Enter, and single-Escape dismissal. See `browser-results.json`.
- Legacy acquisition-cost fragment was used as an incoming URL and correctly normalized to the existing efficiency fragment with state retained.

### Limits and qualifications

- This is **not a full-repository green-suite claim**. The default full test launch hit resource pressure; bounded full/broader readable-URL runs were stopped before completion after long-running DOM/export cases. Only terminally completed focused suites are counted above.
- Full ESLint reports three unchanged pre-existing errors in `theme-toggle.tsx` and `draft-chart-plot.test.mjs`, plus existing warnings. These files match the base/main source; changed-file lint is clean.
- Browser clipboard read permission was granted only to the task's localhost origin to inspect the actual native copied text; writes were made by the real Copy link button, not a mocked clipboard.
- Desktop Chrome narrow-viewport/pointer/keyboard testing is not physical-phone touch certification.
- This PR does not merge, change production, or migrate the separate graph-page PR #134.

## Reproduction

```sh
node --import tsx --test --test-concurrency=2 tests/chart-toggle-urls.test.mjs
node --import tsx --test --test-concurrency=2 tests/connectomics-brain-scale-ui.test.mjs tests/extrapolation-ui.test.mjs tests/extrapolation-motion.test.mjs tests/recording-sharing-state.test.mjs
npm run typecheck
NEXT_PUBLIC_BASE_PATH=/neuro-atlas ATLAS_SITE_URL=https://www.plneuro.xyz ATLAS_INDEXABLE=false npm run build -- --webpack
```

Native browser replay uses `scripts/qa/chart-toggle-urls.py` inside an owned browser-harness window, with `TOGGLE_QA_BASE` set to the task-owned production server and `TOGGLE_QA_OUT` set to a writable evidence directory. `TOGGLE_QA_RESUME=1` resumes only completed recorded cases after an interrupted capture; fresh navigation resets each case.
