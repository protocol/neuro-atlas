# Neuro Atlas — neutral Investors correction

Owner correction after PR124: remove the prominent Protocol Labs portfolio feature and correct the financing count in the ordinary ranking. This is a follow-up PR, not a merge or production release.

## Revisions and scope

- Base: `1a7bb47a6ac6e0a26026fc932d0ecf9d7550c06c` (includes owner-merged PR124 and the separate Analytics PR123).
- Runtime/source candidate: `6e4a7ff73a620ac873860938d22fa895db975600`.
- Subsequent `b555ec1` adds only source-review markdown and the replay's visible-heading selector fix. The hidden mobile Navigation heading is not the first visible content heading; no application change was needed.
- `before-investors-1440.png`: exact local production-build capture at `586750124dff528c8239a39e3b87162dd64129ab`. Funding component, helper and generated funding data are byte-identical from that runtime to the merged base above (verified with Git diff).
- All after images: exact production-built HTML/assets at the candidate, through a task-only Host-restricted/noindex loopback static viewer. The application and hosted access gates were not changed. This is native Chrome pointer/viewport-emulation evidence, not authenticated hosted verification or physical-phone touch evidence.

## Observable result

The Investors lens starts with the normal leaderboard. No PL-specific portfolio panel, cards, special heading or upward family-context link remains. PL/PLC is a normal row with identical styling and sorting. The reviewed source family now has **four distinct sourced financing records / four companies**: Synchron, Neurosoft, Merge and Science.

This is a public-evidence minimum for the screened BCI cohort, not a complete portfolio count. Exact source names remain in company records. The rank is computed, not pinned; associated financing is the full round size, not check size or a single legal vehicle's portfolio.

Merge was already an indexed financing. Its participants/citations were corrected, not its amount, date precision, date basis or event identity. WIRED supports the existing reported $252M; PL Capital's first-party post says $250M+ and explicitly says it joined. The normal Merge detail exposes both sources. Other named participants from these sources, Bain Capital and Gabe Newell, are retained too. The overall 25-company  / 42-record  / $3,553.96M  / 15-regulatory-marker summary is unchanged; all other investor values are unchanged.

## Native and deterministic checks

`scripts/qa/investors-neutral-20261117.py` completed `{"investors":"PASS","cases":4}` at 1440×1000, 768×1024, 390×844 and 320×800. `native.json` records every row's name/rank/count/class, all four widths, exact four-record family count, document bounds, direct/reload/Back/Forward and repeated-query/hash preservation, plus Merge's exact participant and source-link readbacks.

`production-parity.json` binds the actually served funding HTML and 13 referenced static assets to the isolated production build, source revision and build ID. `manifest.json` hashes the curated captures and receipts. No substituted HTML/UI or invented data was used.

Build and TypeScript passed at the runtime candidate. Changed-file ESLint passed. Whole-repository lint was separately reproduced on the base: 3 existing errors (theme-toggle's synchronous effect, two `module` assignments in draft-chart-plot tests) and 12 warnings. The one new unused import warning was removed; no unrelated lint fixes are included.

Focused source/generator, mounted UI, family counting/deduplication, invalid-provenance, display-name-collision, and frozen-historical-golden checks passed. The historical source/Notables hashes remain unchanged behind exact bounded assertions for the Merge attribution delta. Initial full-suite work on the superseded three-record candidate was intentionally stopped when the fourth participation was verified; it is not a passing run. Final full-suite terminal result and independent final review are recorded in `verification.json` once complete.

## Limits

- Canonical/hosted prelaunch access remains password-gated. A browser sign-in attempt offered no saved login; no credential was extracted and no hosted authentication was bypassed. Local native checks do not prove a real hosted sign-in.
- Echo is an unresolved secondary-database lead; Precision/Paradromics portfolio membership does not establish exact round participation. No synthetic rounds or additional family participations were created.
- Source/legal qualifications: `data/funding-index/source-review-20261117.md`, `investor-groups.json`, and `investor-evidence.json`.
