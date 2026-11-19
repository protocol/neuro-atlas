# Sources and methodology page

The canonical public route remains `/neuro-atlas/methodology`. The page uses `src/data/methodology-sources.json`, grouped by role: datasets/registries, studies, company/institutional disclosures, reporting/curation, external ecosystems/forecasts, and methodology/reference.

## Coverage

The catalog inventories cited links across runtime data, canonical inputs, retained source reviews, scientific references and acquisition/method definitions. Link counts are not counts of distinct studies, datasets, publishers or independently verified observations. Per-record/chart citations retain the specific support relationship and limitations.

`tests/helpers/methodology-source-inventory.mjs` independently scans the source-bearing paths and reconciles the exact included URL set against the catalog. It excludes development/QA/asset/navigation references, unpublished provider surfaces, unused inherited toolkit examples and configured-but-unwired forecast API origins. Two source-linked Google spreadsheets were read cookieless on November 19, 2026 and are explicitly included in their compilation/curation roles. Other Google documents require a publication-state check before inclusion.

The source audit checks catalog completeness and roles; it does not re-adjudicate the scientific or financial support for every claim. The existing disclaimer and individual source qualifications remain applicable.

## Updating

When a source input changes:

1. Read the actual changed source and its use in the rendered surface. Distinguish primary observations from compilations, discovery, context, retired candidates and transport.
2. Run `node --import tsx --test tests/methodology-source-coverage.test.mjs`. Add each genuinely new citation to the appropriate catalog category with a descriptive, source-derived label. Preserve source URL identity; any canonicalized aliases remain traceable to their original literals in the inventory.
3. Check both additions and removals. A URL disappearing from one file may remain evidence for another record. A new hosting/auth/asset URL is not automatically a data source.
4. Run the methodology page/footer tests, standard full suite, typecheck, production build, changed-file lint, and responsive native-page replay. A catalog change is part of the source-data PR; no separate publishing automation is introduced.

The daily-review text is an aim. Existing publication/reference-age and Google Trends feeds retain their validated weekly cadence. This change installs no daily updater, broad source sync or new community submission backend. The page’s Feedback action uses the existing visitor-intake controller, with direct GitHub contribution described as future work.

## Graph routes

`persistent-chart-pages-proposal.md` is a separate architecture proposal. This change leaves graph fragments and pop-outs working as before and does not implement that migration.
