# Publication and researcher charts — primary schema v2

Four native SVG charts retain their positions in **Neurotech field engagement** and stable fragments: `publication-output`, `publication-growth`, `researcher-sectors`, `researcher-sector-changes`.

## Source boundary and integration gate

The UI now accepts only independent primary schema v2. Production input is the anonymous output of `scripts/publications/derive.py`, optionally augmented at **`matchedGrowth`** by `scripts/publications/matched_baselines.py`. See [primary method](publications/primary-method.md). Artio is a design/method reference; no production numeric or freshness dependency remains in the parser, selectors, labels or exports.

**Integrated production snapshot:** `src/data/publications/publication-charts.snapshot.json` is now the completed independently acquired, full-replay-validated schema-v2 source. The old imported schema-v1 reference is no longer a production fallback. No initial merge or live publication is implied; see the current verification receipt and weekly-feed activation gate.

The required source metadata identifies OpenAlex core, actual work/author-history acquisition dates, observation cutoff, source-update maxima, method ID/SHA-256, canonical source hash, input byte hashes and coverage policy. Work and author acquisition may occur in either order. All plotted years end in 2025; 2026 estimates are excluded. Histories are acquired dynamically; the work observation windows remain separate: NT10 wider papers from 2010, P2 two-topic author works from 2000. The primary producer owns which author histories are required for the complete 2022–2025 profile/rank windows.

## Bounded contract

`parsePublicationSnapshot` rejects unknown root/source/table/column/audit/evidence/row fields; private/raw record additions; unrecognized category identities; incomplete or duplicate rows; numeric strings in native tables; nonfinite/negative counts; invalid/future dates; incomplete observation years; inconsistent rounded growth; fabricated `place`; missing transition cells; and inverted/unanchored science bands. It validates enumerated anonymous quarterly coverage and fractional audit fields, including dimension/group identities, totals, known-share thresholds and unscaled Unknown. Audit arrays are bounded to the fixed period/dimensions.

`source.testOnly: true` is rejected by default. Test code explicitly supplies `{allowTestFixture:true}` to the parser and `allowTestFixture` to the chart component. Test fixtures retain the flag through parsing and export; no environment-based bypass or production fallback exists. The ordinary route supplies neither allowance.

`matchedGrowth` uses the adapter's 21 fixed IDs, labels/dimensions, counting method, N/D endpoint counts, units/universes, status/reason, evidence and metrics. It is **not** the obsolete `matchedBaselines` interface. Nested receipts have exact allowed fields, credential-free aggregate OpenAlex URLs and enumerated query parameters; raw author/work IDs, names/searches and raw payload additions are excluded. Supplemental N may retain a bounded exact decimal/rational string; conversion to plotting numbers is explicit. Native tables remain numeric.

For matched rows the parser verifies N/D presence, whole-work integer units, correct P2/NT10 numerator scope, N ≤ D, growth, endpoint shares, growth gap and relative share growth. Method/BCI/career/citation rows cannot claim a matched D under this method. Matching arithmetic validates the supplied receipt contract; acquisition/replay review establishes empirical completeness.

## Numeric and interpretation contract

- **Annual output:** 16 observed NT10 indexed-work counts, 2010–2025, on the left axis. Independently acquired all-research and four-domain science context cover the same 2010–2025 years and use a right-axis index: **2022 = 100**. The mapping is mathematically locked to the actual neurotech 2022 count, so the series deliberately meet in 2022. Earlier years keep that same 2022 denominator; 2010 is never rebased to 100. Archived context table values remain growth-equivalent counts; the plot and inspector convert them to the labeled science index. Legacy four-year context remains readable, but cannot replace a full-history last-good release. Without context, omit its axis/marks/legend. Undefined 2022 growth remains null.
- **Group growth:** 21 rows in seven sections. Nine comparisons are supported when complete inputs are supplied: three NT10 venue comparisons and six P2 region/institution whole-work-involvement comparisons. Both N and D come from that separate matched method. Legacy native fractional N is never paired with whole-work D. Groups can overlap. Display **US and Canada** and **Government agencies and research facilities** rather than broad North America/national-institute claims.
- **Missing comparators:** six method/BCI and six career/citation rows retain their supplied native N (or, when not supplied, native table N) and visibly say **Reference unavailable**. D remains null and unplotted. Career/citation N uses author-fractional works; method/BCI N uses NT10 indexed works. No paper/researcher growth comparison, zero-filled D, global-band substitution or universal neurotech-growth line is drawn.
- **Comparison design:** filled blue circles show neurotech; outlined teal diamonds show same-category research. The two are joined only where both growth values exist. Zero-base N/D is undefined, independently of reference availability. Preview and modal show reference availability on every row. Inspector, source table/download and PNG notes expose counts, units and numerator/reference universes; matched PNG notes include each row's N/D counts and universe.
- **Researchers:** one sector per unique identified author in the publication year. Exact counts and shares accompany deterministic largest-remainder allocation to exactly 100 waffle squares. Missing affiliations stay separate. **Other institutions** is inclusive of government/facility, healthcare, nonprofit, archive, funder and other known types.
- **Publication-affiliation endpoints:** the additive `nt_talent_endpoints` data covers all four origins and destinations, including same-sector endpoints, for identified two-topic authors first observed since 2016 with at least two distinct active years, through 2025. The paired anonymous cohort audit reconciles all sixteen integer cells. Same-sector means **same sector at first and latest paper**, not continuous staying or verified employment. The original `nt_talent_moves` retains only changed endpoints with null diagonals, byte-for-byte unchanged. Older sources may omit the new table and audit together; complete endpoints are then **unavailable**, never recovered from annual totals or zero-filled. This contract change is separate from the parent-owned Sankey presentation.

Native author-fractional output, known-share scaling, omitted known segments and Unknown audit rows remain available separately from whole-work matched comparisons. Freshness labels distinguish work acquisition, author-history acquisition, matched API receipts, global-context acquisition and observation cutoff. Re-rendering does not advance evidence dates.

## Interaction and export

Existing `ChartModal`, navigation/history/focus and `ChartActions`/`ChartShare` remain in use. Inspection starts empty and responds to actual movement, focus or tap. All four previews open the existing anchors. Growth previews scroll through all 21 rows; detail growth SVG retains a readable 860px width within internal horizontal scrolling. The annual series legend and mobile HTML sector key remain independent of SVG scrolling.

Modal downloads are chart-specific subsets (`chart`, `snapshotSchemaVersion`, `source`, selected native tables, anonymous audit and growth adapter where relevant), not importable complete snapshots. PNG export uses the full SVG viewBox, visible series definitions and source/scope notes. Browser numeric precision applies to numeric audit fractions; supplemental rational strings remain verbatim in source JSON.

## Verification

```sh
node --import tsx --test tests/publication-*.test.mjs
npm run typecheck
./node_modules/.bin/eslint src/lib/publication-data.ts src/components/publication-charts.tsx tests/publication-*.test.mjs tests/fixtures/publication-synthetic.mjs
npm test
```

Focused tests exercise strict/private-boundary rejection, actual offline Python synthetic derivation → v2 parsing, null percentages, P2 paired N/D selection, all 21 rows, 9/12 availability, source order independence, zero anchors, inclusive sectors, exact waffle allocation, stable modals, inert initial inspection, mobile HTML legend preservation and source-qualified full SVG image-export payloads. Synthetic fixtures are test-only, never production observations.

The full production build and native light-theme route replay at desktop/390/320 have passed after actual snapshot replacement. The release verification receipt records export/clipboard/theme coverage separately; unit SVG serialization alone is never native PNG acceptance. A temporary shared `node_modules` symlink is sufficient for these unit/type/lint checks; the Next build needs physical dependencies. Unit SVG serialization is not native PNG acceptance. Authentication and existing rail data remain unchanged.
