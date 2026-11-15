# Original-slide trendline — follow-up verification

## Requested change

Add the trendline like the photographed original. The olive stroke is a **visual reconstruction**, separate from the 14 observation records. It is not a newly fitted regression or a recovered statistical model. The original numeric table/conversions and fit method remain unavailable. No uncertainty band or forecast is invented.

## Source and runtime

Runtime: `5eab366c336867269d4ef071164f9414718f5dc0`.

Eight visible centerline pixel samples are recorded under `referenceTrendline` in `src/data/bci-bitrate.source.json`. They use the existing photograph rectification/year–log-rate calibration. The display is clipped to observed years 2000–2025, with log-space boundary intersections. All 14 observation/native-source objects and the original calibration are exactly unchanged from the preceding PR head.

Captures are actual headed-Chrome UI and native PNG/clipboard output from a separately built, explicitly enabled loopback-only fixture. Source authentication/launch/package files are unchanged. Local-origin image footers identify the fixture; these are not hosted-chart screenshots or proof of successful hosted authentication.

## Executed checks

- Initial new trendline tests failed before implementation (source trace, rendering and native export absent).
- Final runtime: **31 focused tests passed**, typecheck exit 0, real-source production build exit 0, separate fixture production build exit 0.
- An additional interpolation-replay assertion was added after the runtime commit; **10 BCI/rail tests passed** with it. This tests-only/evidence delta does not alter the runtime.
- Native browser replay passed at **1440/390/320px**: exact chart title, reference line in preview/detail, increasing x/decreasing SVG y, visible approximate line key, 14 marks/14 source rows, bounded controls/document/text, unchanged source inspection/no fake links, Escape/focus/history, and exact Copy link clipboard readback.
- Native Download PNG and Copy chart PNG visibly retain the olive trendline and **≈ Slide trendline (visual reconstruction)** key, all 14 qualified observation identities and PL R&D branding. Clipboard types include PNG/plain text/HTML. Temporary loopback clipboard-read permission restored.
- Independent review of exact runtime delta: **PASS**, including source-photo/crop inspection, independent pixel/calibration/interpolation replay, unchanged observation audit and export qualification. Reviewer completed 68 focused/integration and 25 sharing tests; its initial combined run timed out, and the completed serial reruns are the retained evidence.
- All **12 served JavaScript/CSS assets** match the pinned fixture build. Build ID/artifact hashes are in `acceptance.json`.

A later source-ledger wording correction distinguishes the unavailable original statistical model from the displayed visual trace. The actual exported chart definition/evidence object remains byte-identical to tested runtime `5eab366` (SHA-256 `2509a303290f8fffaf843cc2bc1be243426332abc2e82ea43851d20c8450c30b`); renderer and calibration/observation values are unchanged.

The full 1,270-test run belongs to the earlier implementation revision and is not relabeled as a full-suite run on this follow-up. Independent review is recorded separately in the PR.

## Evidence

`chart-desktop.png`, `chart-390.png`, `chart-320.png`, `bci-bitrate-native-export.png`, `bci-bitrate-native-clipboard.png`, `native-qa.json`, `clipboard.json`, `native-qa.py`, `acceptance.json`.

Earlier no-trendline captures remain untouched in `../bci-bitrate-20261115/` as historical evidence.
