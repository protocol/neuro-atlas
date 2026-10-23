# Retired Metrics QA — October 23, 2026

Candidate browser runtime: `27c5b4c52457cafa05cd3178777781b94f7af34f`. Subsequent evidence-only commits must have an empty application-source/dependency/config diff against this revision.

Baseline: `84476107b0fa1614df826aaed89f4202b4734795`, source-equivalent to merged `b8c33e5d43fddbf975f79493a999f402da29628b` (verified `git diff --exit-code` for src, package manifests and Next config).

## Gates
- Regression suite: 297 passed, including 20 retirement regressions. Initial RED specifically failed on the still-rendered `gauss-zebrafish` observation.
- Type generation / TypeScript and scoped ESLint passed.
- Disposable production build passed; all 11 served JS/CSS/other static references matched local compiled bytes (see `served-assets.json`).
- `native-qa.json`: 87 real browser cases across 1440/390/320 widths: hero/catalog inventory coherence (5 categories / 18 numeric panels / 77 observations / one timeline); Back/Forward; exact 77 retained source-observation identities; 12 cards / 18 numeric plots + timeline; category counts; exclusion searches; every retired candidate/panel legacy and clean fragment; source-context preservation; reference-modal focus/Escape; retained consolidated charts.
- `native-history.json`: extracted receipts for the three actual Back/Forward cases between a retired anchor and retained chart, already included in the 87-case total.
- Full source evidence, definitions, stable link registry, shared snapshots, auth/config and dependencies remain byte-identical to base. Retirement is a presentation projection, not source-record deletion.

## Images
- `hero-catalog-1440.png`: corrected hero and upper catalog together.
- `hero-catalog-320.png`: corrected narrow hero and catalog controls; category rows below the fold are covered by the separate catalog screenshot.
- `before-catalog-1440.png`: prior seven-group catalog including Tissue quality.
- `catalog-1440.png`: five scientific categories + Field context; current counts.
- `catalog-320.png`: narrow catalog, naturally wrapped names/counts.
- `chronic-cohorts-390.png`: retained named chronic cohorts, followed directly by recording-hours metric rather than temporary Precision panel.

## Limits
Browser screenshots/probes use a disposable **loopback-only** passthrough `proxy.ts` fixture; this file is outside the branch and must never be committed/deployed. They are viewport-emulation tests, not physical-phone results or authenticated hosted acceptance. Production auth is unchanged. No dependency upgrades or vulnerability remediation are included. No merge/production deployment performed by this task.
