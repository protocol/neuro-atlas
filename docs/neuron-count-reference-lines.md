# Neuron-count anatomical references

The selected published connectomes neuron-count chart adds three static, dashed
whole-brain anatomical estimates: mouse 70,890,000, rhesus macaque 6,376,160,000,
and adult male human 86,100,000,000 neurons. Their source citations, uncertainty,
methods and population scopes live in `src/data/whole-brain-neuron-references.ts`
and the chart's native Source notes column. The selected-data JSON retains the
same disclosure. These estimates provide anatomical scale context alongside the
study-reported map counts.

## Boundaries

- `metric-chart-visibility.ts` attaches `horizontalReferences` only to
  `largest-connectome-neurons`; all ten source observations remain unchanged.
- The preview, modal and existing full-chart image export use the same logarithmic
  value mapping. The axis expands to include visible reference values with label
  room; turning all three off restores the observation-only range.
- Compact previews use a one-line “Neuron counts” caption and a 152px coordinate
  height, keeping the existing 300px card cap. The full modal/export title stays
  unchanged. Labels use separated vertical lanes and short association leaders;
  overlap-ring increments are bounded to the shared marker stroke width. Narrow
  modal layouts reserve extra vertical room for the existing observation badges.
- The full neuron modal has one native “Whole-brain references” switch below the
  SVG, using the neighboring benchmark's pill styling. It starts off and shows or
  hides Mouse, Macaque and Human together. Compact previews stay all-on and have
  no switches. A change clears pinned inspection without restoring mark focus.
- Source links and all three species/method definitions remain in the native
  Sources and selected-data JSON even when their overlays are hidden. JSON adds
  `visibleNeuronReferences` in source order. Image/clipboard exports serialize only
  visible reference lines, labels and reference notes, preserving all observations.
  No fit, extrapolation or completion ratio is added.
- `neuronRefs=mouse,macaque,human` enables the group on this chart only; the off
  default omits the parameter. Valid nonempty legacy subsets normalize to all-on;
  legacy `none` normalizes to off. Invalid, duplicate, unknown or cross-chart
  tokens use the off default. Canonical and legacy chart fragments,
  Copy link, fresh loads, reload and Back/Forward restore the selection. View
  changes preserve router fields and repeated unrelated query entries; Close or
  Escape dismisses in one action. Other chart links discard this parameter.
  Export URLs preserve only valid chart-qualified state, never credentials or
  unrelated queries. No route or fragment is replaced.
- The public-data-size and acquisition benchmark implementations are untouched.

## Regression evidence

`tests/neuron-reference-lines.test.mjs` checks exact values, log coordinates,
preview/modal marks, narrow label/badge separation, source disclosure, observation
counts, selected JSON and the existing PNG serializer. It also checks the compact
coordinate-height cap; native clipping/appearance remains a separate browser QA
requirement.

`tests/fixtures/neuron-reference-baseline.json` was captured independently from
base `df97d0d70736465657ac50bc9569bbc1b60e6095`, before implementation. It pins all
15 plot definitions/observations, preview/modal markup and registered image
payloads/SVGs. All 14 unrelated plots must remain byte-identical after normalizing
React-generated IDs. The neuron observation table also stays byte-identical.

The older sensory SVG goldens remain frozen. Their compatibility helper first
asserts the entire exact approved reference field against a separate fixture,
then removes only that field when reconstructing the prior presentation. Other
metadata, coordinates, source values and marks remain subject to the original
goldens. Existing baseline failures are reported separately rather than repaired
or hidden by this feature.

Historical whole-file copy/source-ledger checks also opt into
`neuron-reference-file-delta.json`: exactly the renderer, visibility projection
and two source-directory additions are reversed to immutable base bytes before
older copy/funding deltas are applied. The fixture's complete current/base hashes
are asserted separately. Unknown line or catalog edits survive reconstruction or
fail closed. No original historical fixture or golden hash is regenerated.

`tests/neuron-reference-toggles.test.mjs` exercises both grouped states, one
default-off under-plot switch, exact off-SVG restoration, source immutability,
observation-only scaling, URL/history/copy behavior, all valid legacy subsets and
malformed tokens, selected export metadata/JSON, preview invariance and focus-safe
clearing. Its single-switch and URL-normalization tests failed against the old
behavior before the corresponding runtime changes.
`neuron-toggle-file-delta.json` reverses only the four exact existing runtime-file
changes onto PR154 base `8393a96823aeb4dfb43894392c78940da812949c`. Separate exact
current-main and financing-catalog edges compose owner-approved main `866ce97`
without modifying older fixtures. Raw financing locks validate the full current
feature hashes and exact two added study definitions before comparing unchanged
financing identity; they never import a historical reader.

The single-switch correction adds `neuron-single-toggle-file-delta.json`, pinned
to `102e4bdd324d2e9070f57a9c52e0faad94960559`. Its four exact runtime-file deltas
compose ahead of those frozen edges. Tests assert the correction's complete
current/baseline hashes, forward and reverse bytes, exact file inventory, and
rejection of unlisted changes. No older fixture, scientific value or golden was
regenerated.
