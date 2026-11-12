# Field Velocity legibility — verified handoff

## Scope and revisions

Requested: bigger dots, vertical year divisions, connected genuinely related observations, wider/shorter sections with less next-card peek. All **24 rendered Metrics charts** were reconciled against the actual route, not only chart definitions.

- Main/base includes owner-merged PR102: `cc1ceaa41e0547144be462068496449ee284fa6b`.
- Final runtime, tests, native replay and bounded review: `a220bbb55eea471bacc623513e5809efada000e3`.
- Feature-only PR; no chart merge or production release authorized or performed.
- `implementation-handoff.md` and the root acceptance inventory preserve the original code-only worker handoff. **This README and `final/final-acceptance.json` supersede its pending-native status and original 24px mobile-peek description.**

## Observable changes

- Fixed-size scientific marks: 5 CSS px preview / 6px expanded, measured through real SVG CTMs; dense weekly samples retain2.5px. Quantitative waffle/Sankey encodings remain intact.
- Temporal charts: quiet 1px annual divisions, projected on existing date/year domains. Numerical scatter, growth percentages and composition charts receive no invented time axes.
- Connections: TUSZ releases, Neuralink cumulative recipients in both relevant charts, reliable citation medians; existing publication/term histories retained. No cross-project/species/technique/cohort inference.
- Equal outer heights retained. Desktop cards measured649.1×647→856.8×615;390px cards284×879→300×829;320px cards214×1016→230×938. Mobile next-card peek24→8px, with16px gap.
- Native320 clipping of the long BCI growth heading was present on main; widening now puts it5.25px inside the SVG. Growth endpoint text keeps a real6px gap beyond the enlarged dots.

## Executed acceptance

- Standard `npm test`: **1,187 passed,0 failed,0 skipped** at the final runtime pin. Initial broader replay had five obsolete presentation-contract failures; source/geometry goldens were retained and exact presentation assertions added before the final all-green replay. No scientific golden was replaced.
- `npm run typecheck`, production `npm run build`, diff check: passed. Changed-source lint: zero new errors; retained baseline diagnostics are enumerated in `final/gates.json`.
- `npm audit --omit=dev`: passed, zero production vulnerabilities. No dependency/lock change.
- Native actual Next production app: **24 previews and24 exact-title dialogs at each1440/390/320px**,72 dialog visits; typography roles, bounds, equal heights, no document overflow, resting-popup absence, native source inspection/Escape/close/focus return.
- Real Download PNG handlers: **24 exact PNG Blobs**, decoded and visually inspected. Files `final/export-0.png`…`export-23.png` follow inventory order. These are native downloads, not screenshots of an SVG substitute. Local origin in footer is intentional and not a hosted capture.
- Additional native CTM probe:87 fixed-size circles per width at5px, all21 growth percentage labels retain6px clearance, actual horizontal-wheel scrolling succeeds.
- Before/after native source-mark identity matched across all24 previews. Count-proportional Sankey reflow retains one common scale across all16 ribbons. Independent source probes checked14 curated plots/78 observations and112 width/mode combinations.
- Independent full review located C1/C2, both reproduced RED and fixed GREEN; original report is retained. Bounded closure **PASS** at the same runtime pin is recorded in `final/review-closure.md`; both original C1/C2 findings are closed. Two wider reviewer test attempts timed out and are not counted as passes; the reviewer’s terminal 8/8 direct closure plus the parent’s terminal full suite are the passing evidence.

## Evidence and limits

`final/all-chart-native-report.json`, `final/final-acceptance.json`, `final/native-final-extra.json`, `final/native-source-delta-final.json`, `final/before-after-geometry.json`, and `final/gates.json` carry machine-readable receipts. Representative matched screenshots, all24 PNGs, replay scripts and a SHA-256 ledger are included.

Actual app/routes/data/export code ran locally. Only the loopback-only access proxy and unused feedback provider boundary were synthetic. No real feedback was submitted or live Linear write tested in this chart task. Hosted preview remains password-gated/noindex. Viewport-emulated pointer behavior is not physical-phone touch testing. PR102's production deployment was separately verified; it does not deploy this chart PR.

The maintained `scripts/qa/all-chart-design-browser.py` was also exercised after its role/stability correction: all 24 charts × three widths passed. That helper/evidence-only follow-up has an empty `src/`, `tests/`, package/lock and Next-config delta from the reviewed runtime.
