# Notables #66 — bounded data PR verification

## Delivered proposal

Three **Milestone timeline** additions for companies already in the current core roster:

- NeuroBionics: November 5 announcement of a £4.6m ARIA grant; preclinical feasibility, not approval. Historical November 5 Fed H.10 conversion retained as an explicit announcement-date fallback with unknown grant-agreement date.
- Synchron: November 12 **reported** voluntary enrollment pause; directly attributed company statement and separate registry corroboration. Not an FDA hold; Canada's insufficient-recruitment termination is distinguished.
- Neuracle: November 13 **reporting-only** commercial adoption observation (12 implants / up-to-30% Shanghai supplementary coverage), using the original Chinese report rather than BigGo's incorrect NeuroXess attribution.

Science's $400m Series D is already indexed and remains unchanged. **Funding index is byte-identical to the baseline.** Its current rendered coverage excludes standalone grants; the ARIA grant remains timeline-only rather than silently changing that contract. No implant-count chart, field-velocity metric, company roster, regulatory marker, UI/auth, methodology definition, or global coverage date is changed. Eleven additive source-directory citations account for the issue's new evidence links; prior entries/classifications are unchanged.

## Revision and visual evidence

- Baseline: `bc92a0bee01d9490808cd501279eef008048568c`.
- Captured candidate runtime: `55671b985c9f0608d18907538728ff49f91d55d5`.
- Reviewed source: `daa8be97f37ec0ca4bb13c14ab26e5c77ed8416c`; later evidence-only commit does not change runtime/data/tests.
- Captures: actual headed Chrome on loopback-only production builds, **not production or hosted-preview screenshots**. No hosted authentication, noindex, or routing settings were changed. 390px is viewport emulation, not a physical-phone touch test.
- Timeline component, canonical timeline, generated timeline and FX bytes are identical between captured runtime and reviewed source. The later runtime-data change is only the additive source-directory catalog, not timeline rendering or numbers.

Before/after desktop captures show **$1.6b / 17 financing records** unchanged, and awards **1 → 2**. All three new marks render exactly once in 2026, with direct source URLs and announced/reported date labels. All three complete tooltips were read back and visually inspected; desktop and narrow captures are legible and in bounds. 390px has matching inner/client/scroll widths. No Funding index change or metric/implant-chart update is claimed.

`manifest.json` binds each original screenshot to its source SHA and file hash.

## Checks and independent review

- Frozen `npm ci` from the native lockfile; no dependency changes.
- Scanner unit tests: 4 passed.
- Deterministic `npm run data:generate`: stable output on repeated generation.
- Final affected regression set at `daa8be9`: **45 passed, 0 failed**, including all six #66 checks, #64/#65 historical goldens, source-audit scopes, historical FX, grant/financing semantics, actual SSR links and cumulative-capital geometry.
- Complete bounded repository replay (`npm test -- --test-concurrency=2`) at `5b649be`: **1,618 tests, 1,591 passed, 27 failed**. Untouched baseline replay: **1,613 tests, 1,586 passed, the same 27 failures**. These are pre-existing chart/export/config/source-history failures, not a clean full-suite claim. No historical golden was repinned. The subsequent source-directory-only addition has its own exact-delta and inventory checks; all 11 new URLs are indexed and the one unrelated baseline directory gap is unchanged.
- Whole-app typecheck and `/neuro-atlas` production build pass at final reviewed source.
- `git diff --check` passes; no app/component/generator/auth/routing/dependency changes.
- Independent source/diff clean-critic review passed factual, dates/FX, materiality, deduplication and preservation gates. It caught the initial grant/Funding coverage conflict; that was fixed by removing the Funding index addition. Two bounded re-reviews passed the resolution, exact-source historical exclusions, native screenshot distinction and additive citation catalog.

The early build attempt used an invalid path-bearing `ATLAS_SITE_URL`; the successful replay used the required HTTPS origin-only value. The provisional grant-inclusive suite and a stopped intermediate replay were retained privately and are not reported as successful final validation.

**Approval required — no auto-merge.** No merge, production deployment promotion, or live-data publication was performed by this workflow.
