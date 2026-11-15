# BCI bitrate reconstruction — verification

## Artifact and boundary

A populated 14-mark approximate reconstruction in the existing Neuro Atlas Metrics rail, **Human interfaces and recordings**, with canonical fragment `#bci-information-transfer-over-time`. Research and source-native results are documented in [`../../bci-bitrate.md`](../../bci-bitrate.md). The original photograph is not redistributed.

**Runtime tested:** `fe9c732e2470733525f5e678159b24a30bc9076e`.

Screenshots and PNGs here are real headed-Chrome captures/exports from an isolated production build on `127.0.0.1:37271`, using `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`. Its explicitly enabled, loopback-Host-only/noindex proxy fixture lives outside the source branch. Local-origin links in these images identify the fixture, not a hosted release. No production merge or deployment is claimed. Authentication, launch configuration and package manifests match the base revision.

## Executed checks

- Full Node suite at `20e3a5772e19ba3327661737bb1c3809e43f8774`: **1,270 passed, zero failed/skipped/cancelled**, exit 0. The subsequent runtime delta is solely this chart's narrow-screen button-placement reset; the final delta has the focused/native checks below.
- Final runtime `fe9c732`: `node --import tsx --test tests/bci-bitrate-mobile-actions.test.mjs tests/bci-bitrate-data.test.mjs tests/bci-bitrate-integration.test.mjs tests/metrics-always-scroll.test.mjs`: **7 passed**, exit 0. Native CSS placement regression was observed before the final fix; the fixture was rebuilt, restarted and replayed after it.
- Final runtime `npm run typecheck`: exit 0.
- Final real-source `npm run build`: exit 0; separately built loopback fixture: exit 0. Historical acceptance inventory `docs/qa/chart-legibility-20261112/acceptance-inventory.json` remains unchanged.
- Independent source/photo review: **PASS for explicitly approximate reconstruction**. Both located P2 provenance/wording findings were fixed. Independent full code review at the initial implementation and bounded closure through `fe9c732`: **PASS** within their stated scope; closure independently reran the seven focused tests. These reviews do not substitute for native checks.
- Native Chrome replay: **1440, 390 and 320px**, exact opened title and 14 observation IDs/14 source rows; no resting tooltip; approximation visible; document and non-close-control bounds; SVG text bounds; source-native Pandarinath 4.16-bits/s context; unresolved-source popup with no invented link; first Escape dismisses inspection, second closes chart; actual rail-card click, focus return, Back/Forward.
- Native **Copy link** readback at all three widths, preserving origin/path/query and canonical fragment. Native **Copy chart** clipboard readback at desktop: one item exposes `text/plain`, `text/html`, `image/png`; PNG decodes to **2400 × 2244**, plain URL excludes the QA query. Temporary loopback clipboard-read permission restored. Receiving-app paste/physical-phone behavior is not claimed.
- Real **Download PNG** click: raster captured from the native PNG Blob at the download boundary, decoded and visually inspected. Its complete observation key carries all 14 identities, years, approximate values and units, plus four category markers, log axis, PL R&D brand and information link. Clipboard PNG is separately retained.
- Served JavaScript/CSS byte parity: all 12 assets found on the rendered route match the pinned fixture build. Exact build ID, asset hashes and artifact hashes are in `acceptance.json`.

## Scientific limitations

All plotted coordinates remain photo-digitized approximations. Identifiable study sources are reconciled separately; four cursor observations have no verified study identity. Original language-to-bitrate conversion, fitted line, confidence band and speech/typing benchmark derivations remain unavailable; those overlays are deliberately omitted. No common performance benchmark or scaling law is asserted.

## Evidence

- `chart-desktop.png`, `chart-390.png`, `chart-320.png`: actual chart modal at each width.
- `inspection-1440.png`, `inspection-320.png`: native study-context popover.
- `bci-bitrate-native-export.png`: actual native Download PNG output.
- `bci-bitrate-native-clipboard.png`, `clipboard.json`: actual native clipboard PNG and types/dimensions.
- `native-qa.json`: three native replay receipts.
- `acceptance.json`: pinned runtime/build, served-asset parity and artifact hashes.
