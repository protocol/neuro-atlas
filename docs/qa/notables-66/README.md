# Notables #66 — bounded data PR verification

## Delivered proposal

Three **Milestone timeline** additions for companies already in the current core roster:

- NeuroBionics: November 5 announcement of a £4.6m ARIA grant; preclinical feasibility, not approval. Historical November 5 Fed H.10 conversion retained as an explicit announcement-date fallback with unknown grant-agreement date.
- Synchron: November 12 **reported** voluntary enrollment pause; directly attributed company statement and separate registry corroboration. Not an FDA hold; Canada's insufficient-recruitment termination is distinguished.
- Neuracle: November 13 **reporting-only** commercial adoption observation (12 implants / up-to-30% Shanghai supplementary coverage), using the original Chinese report rather than BigGo's incorrect NeuroXess attribution.

Science's $400m Series D is already indexed and remains unchanged. **Funding index is byte-identical to the baseline.** Its current rendered coverage excludes standalone grants; the ARIA grant remains timeline-only rather than silently changing that contract. No implant-count chart, field-velocity metric, company roster, regulatory marker, UI/auth, methodology definition, or global coverage date is changed. Eleven additive source-directory citations account for the issue's new evidence links; prior entries/classifications are unchanged.

## Revision and visual evidence

- Original baseline capture: `bc92a0bee01d9490808cd501279eef008048568c`.
- Current main base after the concurrent contributor-readiness merge: `5e9b68881261297a59b43d442fead2eed7a2bc37`. Its roster, financing, timeline component and payload are byte-identical to the captured baseline.
- Final tested/built/captured candidate: `3a3187a717f2238a485fcf6e828a9fcbd3ff585d`; later commits add evidence only.
- `current-main/` contains six fresh exact-candidate captures; all six are pixel-identical to the independently reviewed earlier captures. Earlier originals remain intact, not overwritten.
- Captures: actual headed Chrome on loopback-only production builds, **not production or hosted-preview screenshots**. No hosted authentication, noindex, or routing settings were changed. 390px is viewport emulation, not a physical-phone touch test.
- All three complete source-bound tooltips, financing/award summary, narrow bounds and the eleven rendered source-directory links were reverified on that final production build.

Before/after desktop captures show **$1.6b / 17 financing records** unchanged, and awards **1 → 2**. All three new marks render exactly once in 2026, with direct source URLs and announced/reported date labels. All three complete tooltips were read back and visually inspected; desktop and narrow captures are legible and in bounds. 390px has matching inner/client/scroll widths. No Funding index change or metric/implant-chart update is claimed.

`manifest.json` binds each original screenshot to its source SHA and file hash.

## Checks and independent review

- Frozen `npm ci` from the native lockfile; no dependency changes.
- Scanner unit tests: 4 passed.
- Deterministic `npm run data:generate`: stable output on repeated generation.
- Final affected regression set, including current-main contributor-readiness checks: **50 passed, 0 failed**, including all six #66 checks, #64/#65 historical goldens, source-audit scopes, historical FX, grant/financing semantics, actual SSR links and cumulative-capital geometry.
- Complete bounded repository replay (`npm test -- --test-concurrency=2`) at `3a3187a`: **1,624 tests, 1,597 passed, 27 failed**. Untouched current-main `5e9b688` replay: **1,618 tests, 1,591 passed, the same 27 failures**. These are pre-existing chart/export/config/source-history failures, not a clean full-suite claim. No historical golden was repinned. All 11 newly introduced evidence URLs are indexed; the one unrelated baseline source-directory gap is unchanged.
- Whole-app typecheck and `/neuro-atlas` production build pass at final reviewed source.
- `git diff --check` passes; no app/component/generator/auth/routing/dependency changes.
- Independent source/diff clean-critic review passed factual, dates/FX, materiality, deduplication and preservation gates. It caught the initial grant/Funding coverage conflict; that was fixed by removing the Funding index addition. Two bounded re-reviews passed the resolution, exact-source historical exclusions, native screenshot distinction and additive citation catalog.

The early build attempt used an invalid path-bearing `ATLAS_SITE_URL`; the successful replay used the required HTTPS origin-only value. The provisional grant-inclusive suite and a stopped intermediate replay were retained privately and are not reported as successful final validation.

**Approval required — no auto-merge.** No merge, production deployment promotion, or live-data publication was performed by this workflow.
