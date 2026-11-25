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
  value mapping. The axis expands to include the reference values with label room.
- Compact previews use a one-line “Neuron counts” caption and a 152px coordinate
  height, keeping the existing 300px card cap. The full modal/export title stays
  unchanged. Labels use separated vertical lanes and short association leaders;
  overlap-ring increments are bounded to the shared marker stroke width. Narrow
  modal layouts reserve extra vertical room for the existing observation badges.
- Source links and species/method qualifiers are in the native Sources and data
  disclosures; image metadata retains those details. No fit, extrapolation,
  completion ratio, toggle, route or query state is added.
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
