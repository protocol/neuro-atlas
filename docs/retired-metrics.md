# Retired measurement presentation

This change retires five standalone panels from the reader-facing Metrics catalog:

- GAUSS-EM section rejection (`gauss-section-rejection`)
- MICrONS selected-region section loss (`microns-section-loss`)
- Precision temporary surface recordings (`precision-temporary-recording`)
- MICrONS automated structure–function matching (`paired-auto`)
- Comparative specimen counts (`comparative-specimens`)

The section-loss and comparative metrics no longer have any visible panels. The now-empty Tissue quality and annotation category is omitted rather than rendered as a placeholder. Search, summaries, counts, source tables and plotted marks use the same presentation projection.

The combined human/mouse RoboEM chart remains one plot; its older mouse-panel URL remains an alias. No standalone hardware-history narrative exists in the Atlas catalog. The automated MICrONS matching result remains only in the previously consolidated structure–function point's source context, not as another plotted observation. Acquisition throughput/economics and the other retained metrics are unchanged.

## Preservation and navigation

`src/data/metric-chart-visibility.ts` owns presentation retirement. Original evidence, source values, definitions, provider snapshots and stable fragment registry are not deleted or rewritten. This is a UI retirement, not removal of public scientific source records from the repository.

Old `draft-*` and `metric-*` fragments remain valid. Retired panels resolve to their retained category without rendering the retired chart. Section-quality fragments resolve to Mapping scale because their former category has no published readings. There are no copy/direct-link controls for retired panels and no empty cards, WIP or retirement notices.

Current curated presentation: 12 metric cards, 18 numeric plots / 77 observations, plus one categorical timeline. Archived evidence remains 23 numeric plots / 85 observations. Existing reference and Field context views are unchanged.

## Verification contract

`tests/retired-metrics.test.mjs` checks exact retained observation identities, excluded source marks, category/count/search agreement, original mouse consolidation, retained automatic-match context, and both fragment prefixes under fresh/repeated/history navigation. Existing all-fragment, source-provenance, related-measurement, modal and reader-policy regressions continue to run. Private deck identifiers and review conversations are intentionally outside this repository.
