# Connectomics source backfill — native QA

## Runtime and scope

- Baseline: `0f2045b102828b2d6bf6a7ce5d3756c379647d44`.
- Candidate runtime: `f1b63423307288bf847033b1375f79fd11da73ed`.
- Actual Next 16.4.6 production builds, `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, in a disposable loopback-only fixture bound to `127.0.0.1`. All candidate `src`, public assets and Next configuration match that revision except the disposable, host-checked local proxy. Production authentication is unchanged in this PR.
- Screenshots and native PNGs show the local fixture, not a hosted preview or production release. Local referral URLs in the exported image reflect that fixture origin.

## Acceptance

- Two affected charts, six viewport/modal cases: desktop 1440 px, narrow 390 px and 320 px, both charts. Each renders the exact expected observation IDs: ten neuron counts and eight tissue-volume observations. No connected series or fit was introduced. Source tables match each chart’s full observation set.
- Compared dialog/document geometry with the matched baseline, including inherited desktop dialog overflow. No new text clipping or document overflow in the measured cases.
- Both Sources sections display the paper links and a separate **EM Datasets, shared by Forrest Collman** discovery link. Both native JSON-download payloads retain the exact source-qualified data and source credit. Existing fractional-year date arithmetic can differ between browser and Node by one IEEE-754 ULP; the comparison tolerates only that coordinate difference, with the remaining payload exact.
- All six new observations were opened through real keyboard-activated source inspectors at 390 px. Paper links, dates, exact notes and catalog rows matched canonical data; the first Escape dismissed inspection while retaining the chart modal.
- Both actual **Download PNG** buttons generated real PNG blobs successfully. The registered native export API was also exercised. Raster inspection confirmed the populated plots, historical labels and `>25,000` Eyewire II study-key entry. The spreadsheet credit is in SVG description metadata; it is visibly shown in the Sources section and JSON, rather than painted into the PNG.
- Independent code/scientific review found no P0/P1 defect, security concern or logic error at the candidate runtime. Its remaining browser/PNG gate was satisfied by the native checks above.

## Test receipts

- Production build and TypeScript check: exit 0.
- Changed runtime/source/test lint: exit 0, zero errors.
- Full suite completed: **1,458 tests, 1,457 passed, one stale seven-point tissue-count assertion failed**. The expected count was updated to eight with an additional exact-once assertion for the new Helmstaedter point. This changed only a test; runtime source stayed at the reviewed revision.
- Final affected source/export/preservation/navigation replay: **39 passed, zero failed**, including the corrected tissue case. The full run is retained as a failed original run, not relabeled green; its other 1,457 passing results are retained for unchanged tests and runtime.

## Images

- `neuron-counts-desktop.png`, `neuron-counts-mobile.png`: expanded native neuron chart.
- `tissue-volume-desktop.png`: expanded tissue-volume chart.
- `sources-mobile.png`: native paper/discovery source credit and data download.
- `neuron-counts-native-export.png`: actual native exported PNG, including the Eyewire II lower bound.

The reviewed change remains PR-only. No merge, production deployment, edits to the supplied Sheet, or message to Forrest were performed.
