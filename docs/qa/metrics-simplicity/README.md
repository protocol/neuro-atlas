# Metrics simplicity — October 30, 2026

## Source and evidence boundary

Candidate runtime: `c884b3a1011caccaf8d395b9376853fb7b0a22d8`. Later evidence-only commits do not change app/data/assets. Baseline: merged main `0af1260c33adbe3a06c7477668102772d1071575`; its application tree equals prior runtime `f929a5938fc9f481936497505555239f2c184c14`, used for the before captures.

These are native headed-Chrome captures of local production builds mounted at `/neuro-atlas/field-velocity`, bound exclusively to 127.0.0.1. Only the disposable QA clone substitutes a local proxy fixture; production auth/source are unchanged. They are not positive authenticated hosted verification. The mobile image is a crop of original browser pixels, not a reconstructed UI. Screenshot hashes/dimensions are in `screenshots.json`.

## What changed

- One top-level methodology/download hint; no repeated subgroup headings, expansion hints, Direct link duplicates, generic source-status eyebrows or group-accounting KPI tiles.
- The five ordered groups still start with their chosen featured chart. Show all sits beside it on desktop and inserts peer cards into the same grid: three columns on wide screens, two at medium sidebar widths, one on narrow screens.
- Each curated numeric panel/timeline is one tile. Context, complete definitions and provenance remain in its modal, not another preview wrapper. Scientific units, dataset scopes and observation-linked ≈/≥/> qualifications remain visible.
- Source values, curated/raw inventories, aliases, production proxy, package files and lockfile are unchanged. All 85 archived observation objects remain intact; 77 retained curated observations appear in 14 numeric plots, plus the retained timeline and supplemental chart families. Historical cohort context is not counted as a fifth engagement chart.

## Native checks

- 1440/1024/768/390/320px: five group order/defaults; headline/preview/full states; adjacent Show all; real max-three-column row geometry; no hidden-fragment leakage, subgroup headings, clipped ticks or document overflow. Effective preview axis text checked at actual rendered size (at least about 11 CSS px).
- Expanded actual chart counts by group: 4 / 3 / 6 / 4 / 3. All 20 existing charts are retained; only five are shown at rest. The engagement cohort scalar is separate.
- 45 curated and 15 supplemental modal cases at desktop/390/320: populated real values, named focus, Escape and trigger focus return. Curated cases additionally exercise reverse Tab, visible Close and Back/Forward. Fifteen Expectations-related measurement Back/Forward/Escape focus loops also pass.
- All recording-hours point identities and exact linear-date/log-hour geometry, every point keyboard/source-link inspection, legacy aliases, five dataset searches and retained seven-point neuron curve verified.
- Actual clipboard readback for Trends, Pace and curated Copy link, plus real PNG + plain URL + HTML payload/decode for recording hours. Receiving social editors can still choose one format; no social post was published.
- Both themes at desktop/390/320: painted borders and resolved SVG text colors survive flattened wrappers. Viewport/pointer testing is not physical-phone touch testing.

The initial native pass caught 8.55px reference ticks at 1024px; the medium two-column breakpoint fixes that case. Original failed receipts are retained privately, not presented as the passing result. Full final-head test/typecheck/build/lint and independent review receipts are summarized in the PR after execution.

## Existing dependency warnings

The unchanged lockfile's fresh npm audit reports five high entries; two remain with dev dependencies omitted (`source-map-js`, `zod`). This UI-only PR does not upgrade dependencies or claim they are security-clean. Source-data/auth/package invariance is independently checked.
