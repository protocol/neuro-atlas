# First → latest publication-affiliation Sankey

The retained `#researcher-sector-changes` URL now opens a full first/latest endpoint comparison. The user-facing title changes to **Researchers’ first and latest affiliations** so same-sector endpoints are not mislabeled as changes.

## Measurement and coverage

- One shared **people-count scale** for all ribbons and nodes. The plot is not normalized separately by origin.
- All four starting and ending sectors: Universities, Companies, Other institutions, and No listed affiliation.
- The full sixteen-cell `nt_talent_endpoints` matrix includes equal first/latest sectors. The original twelve-cell changed-only `nt_talent_moves` matrix retains its null diagonal and original values for provenance.
- Eligibility retains first observed selected-topic publication in 2016–2025, with at least two distinct active publication years through 2025. One identified author contributes once to one endpoint pair.
- Same-sector ribbons mean **same sector at first and latest paper**. They do not establish continuous staying or enumerate intermediate moves.
- No listed affiliation describes absent publication-affiliation metadata. Other institutions keeps the producer’s inclusive classification.
- Percentages in inspection and exported row details use the complete starting-sector cohort, including same-sector endpoints. These denominators differ from the earlier changes-only chart.

The producer and contract validation own the additive complete matrix and cohort audit. Annual researcher-sector counts are a different population and are never used to infer a diagonal.

## Rendering and export

`src/lib/publication-sankey.ts` places both columns using one common count scale. Minimum **label slots** reserve readable text space, but do not inflate node heights or ribbon widths. Every positive ribbon has width `count × scale`; explicit zero cells remain in the source table but have no fabricated ribbon.

`src/components/publication-sankey.tsx` shares that geometry between compact preview and full detail. Preview labels stay at 11 CSS pixels; the full graph retains a 900px internal plotting width, with local scrolling on narrow displays. Node names and counts are directly labeled. Each ribbon supports pointer movement, focus, Enter/Space and tap/click for exact counts, within-origin share and endpoint interpretation. A stationary pointer does not preselect inspection.

Copy chart / Download PNG use the complete viewBox, source notes and per-origin values for all sixteen cells. Explicit base SVG paints keep transient ribbon emphasis out of exported images. Source JSON retains the full endpoint matrix, cohort audit and archived changed-only matrix.

A snapshot missing the complete matrix shows **Complete endpoint counts unavailable** and disables numeric image export. It is not completed with zero diagonals. A valid zero-population cohort is a separate empty state. Complete bundled endpoint data must not be replaced by an older changes-only live feed.

## Verification

- Selector: four origins, exact source-cell identities, optional complete matrix, explicit unavailable state.
- Layout: source/target conservation and a common scale across all ribbons, including zero and highly skewed inputs.
- Component: direct node labels, same/different endpoint semantics, keyboard inspection, source JSON and all-cell PNG notes.
- Source lane: complete raw-record replay, strict sixteen-cell/cohort validation, unchanged archived off-diagonals and unrelated observations, original acquisition dates and input hashes.
- Native route: desktop/390/320 fresh URL, source matrices and totals, node-label bounds, effective font sizes, internal scrolling, Escape/focus/history and actual PNG output. Local fixtures are labeled separately from authenticated hosted acceptance.

This is a reviewed code/method/data-contract change, not an automatic data-only refresh or merge authorization.
