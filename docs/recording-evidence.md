# Simultaneous neural recording evidence

The existing `#simultaneously-recorded-neurons` anchor now opens **Simultaneous neural recordings**. Its compact tile previews only the electrical view. No recording view fits a trend, connects points, interpolates missing years, or offers extrapolation. The shared extrapolation library and the separate recording-hours scenario are unchanged.

## Curated source observations

Canonical data: `src/data/recording-evidence.ts`, checked November 4, 2026. Each observation retains its source URL, excerpt, units, species/preparation, date precision and publication/disclosure basis. These dates are **not experiment or implantation dates**.

| View token | Observations | Important boundaries |
| --- | --- | --- |
| `electrical` | Jun 2017: 741 putative single neurons; Stringer final 2019: 2,668 stable units; Trautmann 2025: 1,012 reported neurons | Individual in-vivo sessions, source-defined quality labels, not a uniform single-neuron benchmark or world-record adjudication. No preprint 2,998 substitution, sequential banks, session totals or pooled single/multi-units. |
| `human-channels` | Card 2026: 256 implanted electrodes; Neuralink VOICE disclosure September 18, 2026: approximately 3,000 company-reported implant channels | Card's online publication is June 15 (July issue). 512 decoder features are not 512 channels; its 2024 paper describes the same implant. Neuralink active/usable yield and distinct-neuron count are unspecified; no exact 3,072 claim. |
| `optical` | Manley 2024: largest field 1,136,223 neuronal signals at 2.2 volumes/s | Mouse dorsal cortex calcium imaging, not electrical spikes or a human implant. One study, no inferred trajectory. |

The seven original 1957–2014 provider checkpoints remain in a separate **Historical benchmarks** disclosure. The 2014 value is visibly approximate, from isolated neonatal mouse retina, ex vivo—not a human brain recording. Earlier preparation/unit-quality details and experiment dates are not supplied by that inherited snapshot. Its JSON and provenance hashes remain unchanged; the curated refresh does not pretend to be a new provider export. Historical data are not mixed into any modern plot or export.

## URL, interaction and export contract

- Parameter: `recordingView`; exact valid values: `electrical`, `human-channels`, `optical`.
- Missing, unknown, malformed or duplicate values resolve to default electrical without rewriting the incoming URL. Case and whitespace are not normalized into a valid token.
- Example: `/field-velocity?recordingView=human-channels#simultaneously-recorded-neurons` (retain the deployment's actual base path).
- Native selector: `[data-recording-view-select]`; active plot root: `[data-recording-view="human-channels"]` (or the other exact token).
- View changes create Back/Forward entries. The focused selector stays mounted; inspection of an old view is invalidated. Close dismisses the modal rather than merely undoing the last selection. A fresh mount/reopen starts with an empty point readout.
- Dots support focus/hover, click/touch-generated click and Enter/Space inspection. All source data remain available in the table without inspecting a dot. The selector has a bounded, full-width 44px-minimum touch target.
- The shared three-action row stays first below the modal header. Copy chart/Download PNG serialize the current view's exact SVG plus point-specific qualified values, dates, units, preparation, limitations, sampling rate and sources, never a random hovered readout.
- Existing **Copy link** navigation preserves current query context. Exported image/clipboard links still strip credentials and arbitrary query parameters: only one exact allowlisted `recordingView` is retained, and only for this recording anchor. Other chart links keep their previous query-stripping contract.

## Tests and remaining verification

Data-contract, real jsdom interaction and actual export-callback regressions exercise the production components. Raster/clipboard browser APIs in Node are boundary fixtures, not proof of native PNG pixels or real clipboard permission. Final browser checks at desktop/320px, actual route/theme, rendered PNGs, hosted access gates and review remain separate parent verification steps. No auth, noindex, feedback, other metric data or provider snapshot changes belong to this refresh.
