# FAFB / FlyWire attribution — verification

Runtime revision: `acb276abcc039237f59ca4cfca0d77722d03c084`  
Baseline: `0f2045b102828b2d6bf6a7ce5d3756c379647d44`

## Scientific change

The original FAFB EM image volume is credited to [Zheng, Lauritzen et al., Cell (2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6063995/), with the Bock-led HHMI Janelia team and collaborators identified. The later reconstructed connectome remains credited to [Dorkenwald et al. and the FlyWire Consortium, Nature (2024)](https://www.nature.com/articles/s41586-024-07558-y).

The new confirmed references carry explicit roles through point inspection, Sources, accessible data tables, marker descriptions and intermediate export metadata. Five existing plots have an explicitly scoped, short `FAFB / FlyWire` image credit. The existing image-footprint citation now opens the readable PMC article instead of that same article's XML representation.

All 86 archived observations retain their IDs, coordinates, dates, qualifiers, quotations, groups and annotation identities. Only five intended observations' attribution/provenance fields and five intended plots' compact-credit fields change. The comparative cell-typing record retains its separate source and hidden status. The 2018 imagery-availability statement does not assert an exact first-release day or backdate the 2024 reconstructed measurements.

## Verified

- Final production source build, including TypeScript compilation: passed. Existing application access controls remain unchanged.
- Changed-source/test lint and whitespace checks: passed.
- Final focused regression closure: **71 passed, 0 failed** across nine data, source, accessibility, export, historical-golden and tooltip suites.
- Recording-view integration serial replay: **13 passed, 0 failed** after a timing-sensitive parallel result.
- Two independent bounded code/scientific reviews: PASS, including exact equality of the compressed historical fixture to the original Git bytes and negative probes against unauthorized source/numeric/geometry mutations.
- Native Chrome: **15 cases**, covering all five affected chart/source pairs at **1440, 390 and 320 px**. Both role-labeled citations, source tables, marker descriptions, keyboard inspection/dismissal and phone-layout pointer activation were exercised. This is viewport emulation, not physical-device touch evidence.
- All **five actual Download PNG handlers** produced decoded images. Each image was inspected; the scoped compact credit and existing brand/referral footer remain legible. Source-role/title/URL descriptions were checked separately in the intermediate SVG; this is not a claim that raster PNGs preserve hidden metadata.
- The narrow FAFB popup's existing product/encoding qualifications remain reachable through native keyboard scrolling. An emulated-mobile mouse-wheel IPC timeout was read back rather than blindly retried; physical-touch/wheel behavior is not certified.

`native-acceptance.json` and `source-invariance.json` hold the reduced receipts and artifact hashes. Screenshots/PNGs here are genuine **local production-build captures**, using a disposable loopback-only, Host-restricted test gate fixture. That fixture is excluded from the branch. Local image footer URLs are test origins, not production links.

## Broad-suite qualification

The initial standard full run was interrupted during a slow integration test. A controlled run of all **248 test files** at the earlier code checkpoint returned **238 passed files, four failed files and six 90-second timeouts**. Three assertion-failure files needed the explicitly bounded attribution/source-list/ARIA-golden updates included here; their original historical goldens are retained, not regenerated. They pass in the final focused closure. The recording-view file passed its final serial replay.

The six slow integration files were retried together with a longer **300-second** bounded window; the process reached that limit and exited **124** without a complete aggregate result. **An all-green broad suite is not claimed.** Slow/time-limited integration coverage is distinct from the passing focused, independent and native checks above.

## Baseline layout limits

The 320 px modal's existing Download PNG header clipping predates this change. Longer source text can introduce the native 15 px vertical scrollbar: the native comparison checks the exact responsive horizontal rescale while preserving all quantitative positions, marker shapes, values and axis meanings. No chart styling, auth, hosting, analytics, feedback or numerical-method change is included.

No merge or production release is part of this change.
