# Recording refresh: verification evidence

## Revisions and surface

- Baseline: `f8c94214e392a121f1dbb80e0c6bf9776fc2bdc3`.
- Native captured runtime: `fe9b870470e780c1cb57cf86f14c36d34cd6957c`.
- These are headed Chrome captures of the actual production-built `/field-velocity#simultaneously-recorded-neurons` route, served on loopback. They are **not authenticated hosted-preview screenshots**. Later documentation/evidence-only commits must have no runtime/configuration/test delta from this runtime.
- Existing provider data and provenance remain unchanged. Curated observations live separately in `src/data/recording-evidence.ts`.

## Completed objective checks

- Typecheck and production build: passed at the captured runtime.
- Recording data/UI, sharing recovery, date-axis, initial viewport, export and point-detail regressions: passed. Full-suite results at the final PR head are reported in the PR handoff, separately from these browser receipts.
- `browser-receipt.json`: **9 populated view/viewport cases passed** (all three views at 1440, 390 and 320px). Every case has an initially visible source mark, an empty initial inspector, keyboard point inspection and no pooled line or extrapolation. The page and modal remain within the requested viewport.
- All three native Copy chart PNGs and Download PNG callbacks produced real browser-generated PNG bytes. The human-channel clipboard PNG is included as `copied-human-channels.png`.
- Copied selected-view links reopen correctly after reload; Back/Forward, close/reopen, focus return, dark mode and source-name search passed.
- Six displayed excerpts were checked against primary text/captions; see `source-quote-receipt.json` and the canonical data's direct source URLs.

## Critic findings addressed

- **F1:** Copy-link feedback is bound to the exact attempted URL, not merely the component label. Clipboard failure → human view → optical view clears the old fallback; the new fallback value/href and a fresh recipient agree on optical. Changing view also clears stale “Copied” feedback. This is covered by the production-component regression and native replay. The native denial test explicitly injects a rejected clipboard API boundary; it is not a claim to have changed OS permission settings.
- **F2:** The human plot labels June and September 2026 at their actual source-date coordinates. The single-date optical plot has one 2024 label, not duplicated endpoints. The same labels survive PNG export.
- The narrow optical viewport now initially reveals its lone observed mark without selecting it, changing coordinates, or changing the exported SVG.

## Evidence index

- `before-recording-1440.png`, `before-recording-320.png`: inherited seven-point historical view.
- `after-electrical-1440.png`: three source-qualified electrical observations, preserving the neuron/unit-count view.
- `after-human-channels-1440.png`, `after-human-channels-320.png`: human implant channel/electrode view.
- `after-optical-1440.png`, `after-optical-320.png`: optical cellular-signal view.
- `copied-human-channels.png`: actual native clipboard PNG, including source qualifications.

## Deliberate limits

Narrow captures use desktop Chrome viewport emulation, not a physical-phone touch test. An internal horizontal chart viewport is retained on narrow screens. Download testing exercises the real callback and produced PNG but intercepts the final blob link, so it does not prove final disk persistence. Hosted deployment identity, exact-route access behavior and the existing auth gate are separate release checks; no successful hosted login is claimed by this evidence. No auth, noindex, provider snapshots, other metric data or production settings were changed.
