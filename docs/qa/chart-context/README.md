# Chart context and financing-area verification

Runtime under test: `542c7195a565f9986a7183ce4ed0ec1ec709483e`. Comparison baseline: `05a314c3889836230d179d7bb5b1f626b6804193`.

## Reproduction and evidence boundary

These are actual headed-browser screenshots of a production build and actual **Download PNG** outputs. A disposable, explicitly enabled, raw-Host-checked, noindex QA fixture was bound exclusively to `127.0.0.1`. It is excluded from this branch; source authentication and hosting configuration are unchanged. The exported information links accurately retain the local capture origin. Screenshots are not authenticated hosted verification or physical-phone evidence.

`artifacts.json` records each image's source revision and SHA-256. The baseline funding image shows the previous variable-width pills; the candidate uses proportional circle area. Evidence-only commits after the runtime SHA do not alter application, tests, dependencies, data, or assets used by the app.

## Verified behavior

- Full standard test inventory with bounded file concurrency: **1,168 passed; zero failures, cancellations or skips** at the runtime SHA. Production build, route type generation/TypeScript, changed-source ESLint and `git diff --check` pass.
- Native chart replay: 15 title-verified chart/viewport cases across 1440, 390 and 320px; populated source marks, correct author cohorts/regional interpretation, initially empty inspection popups, bounded dialogs and no page overflow.
- Financing replay: all 41 source rounds at each of the three widths. Circle area maps to indexed USD on one index-wide scale, including after filtering. Transparent targets remain at least 24px. Every circle's resting center hits its own financing button, and financing targets clear all regulatory badges. Native keyboard tooltip, Escape, source-detail links and return focus pass. The size key remains outside the horizontally scrolling year grid.
- Native Download PNG: public-resource, neuron-count and enabled acquisition-budget charts; white background, PL R&D signature, source/date/qualified-value keys and the short Neuro Atlas information footer. Lee/Reid's boundary-truncated excitatory-target scope remains visible.
- Optional human acquisition-budget guides: five dashed guides, explicit hypothetical volume and all three voxel dimensions; default off. The exact off-state SVG and source rows restore after toggling at narrow widths.
- Recording hours → existing implanted-participant cohorts → browser Back works through the canonical chart links. Related-measurement text uses scoped 12px supporting type.
- Archived chart observations, financing records, publication snapshot, field-velocity snapshot, recording evidence, authentication, API routes, dependencies and hosting configuration remain unchanged. The new MICrONS release-manifest point is an explicit additive presentation observation.

## Measurement boundaries

The July 2021 MICrONS image products and later broader resource report retain separate dates and product scopes. Anatomical mouse/macaque/human lines supply neuron-count scale context; they are neither byte conversions nor reconstructed whole-brain observations. Whole-human budget guides are an acquisition-only planning scenario. Reconstruction evidence separately reports source-specific labor and modeled compute costs.

Unverified aggregate recording totals, clinical-benefit counters, complete public/philanthropic capital and cross-resource last-12-month projections are documented in `../../chart-source-followups.md`. They are not fabricated chart series.

## Test commands

```sh
node --import tsx --test --test-concurrency=4 tests/*.test.mjs
npm run typecheck
npm run build
npx eslint src/components/connectomics-cost-evidence.tsx src/components/draft-chart-plot.tsx src/components/funding-index-dashboard.tsx src/components/publication-charts.tsx src/data/metric-chart-visibility.ts src/data/public-connectomics-context.ts src/lib/draft-chart-types.ts src/lib/funding-index.ts src/lib/human-acquisition-targets.ts
```

The full-suite result and remote preview status are recorded in the PR after their completion. Local/browser claims above do not imply a production release.
