# Annual publication comparison — verification

Runtime reviewed and captured: `0492d3f2b14de25355d91d384a9f72be69ed0eeb`.

## Display contract

- Left axis: actual annual neurotech paper counts. The 16 observations are unchanged.
- Right axis: all-research index and four-domain range, **2022 = 100**.
- The two scales are mathematically linked: science index 100 maps to the actual 2022 neurotech count, **9,726 papers**. Their 2022 overlap is intentional.
- All science series extend from 2010 through 2025 using their own **2022** denominators. There is no 2010 rebasing.
- Preview, modal, shared-year inspection, source notes and PNG consistently distinguish counts from indices.

## Source verification

`docs/publications/annual-science-history-20261106.json` contains 80 actual aggregate source counts (five groups × 16 years), public request parameters, acquisition times and response hashes. The five science requests and eleven unchanged matched requests completed through the existing bounded transport; exact offline baseline replay reproduced the receipt manifest. The full private primary-source replay and staging completed and independently reproduced all numerical values and science-source metadata.

The replay used later original receipts for the 11 unchanged matched queries. Its 22 receipt timestamp/body-hash fields differ from the bundled original matched evidence, while all numerical values agree. The bundle deliberately preserves the existing matched evidence rather than replacing unrelated provenance. All nine other tables, audit data and matched-growth values are unchanged.

Strict parsing accepts either complete legacy 2022–2025 science context or complete 2010–2025 context; partial/mixed histories are refused. Server and client retain a full-history last-good snapshot if a legacy feed would truncate it.

## Executed checks

- Production source build/typecheck and targeted lint passed.
- Final publication/source/sector focused tests passed. Python publication acquisition, derivation, coverage and replay tests passed.
- Native production-build replay at **1440, 390 and 320px**: 16 actual and 16 science marks, exact 2022 coordinate equality, readable axes, no preview text clipping or pairwise overlap, visible three-series preview key, deliberately activated shared-year tooltip, Escape/native preview click/focus return.
- Actual Download PNG handler executed after selecting 2022. The raster retains both axes, complete history, legend and provenance while excluding the tooltip and hover guide.
- Independent code/math review and bounded re-review passed with all material findings closed. Current main's merged sector-change subtitle/direct labels are retained.

An earlier broad sweep passed **916/917** tests; the unmodified performance-modal “Forward restores modal” assertion failed once. Its six-test file passes isolated on both the reviewed baseline and candidate, but the broad failure's root cause is unclassified. This is not a claim of a wholly green broad sweep.

## Evidence boundaries

These images are from a disposable **loopback-only production-build fixture**, not hosted or production acceptance. The fixture proxy is outside the source branch and is never committed or deployed. Its real-host rejection was checked. The actual source auth gate remains unchanged. The PNG's loopback footer identifies this QA origin.

The narrow detail plot retains internal horizontal scrolling; its wrapping shared-year HTML readout remains available when part of the tooltip is offscreen. The compact preview itself fits without a second horizontal scroller.

`native-results.json` records measured geometry and the exact runtime revision. The native probe requires a fresh document before every width/retry, including after a failed run, so fragment navigation cannot retain an older rebuilt bundle.

## Review/release boundary

This change is PR-only. No merge, production deployment, data-feed publication, access change or scheduled-job change was performed. The weekly source code now acquires the full science history; its installed reviewed producer pin must move through the existing human-merge/runtime gate before this method update is activated.
