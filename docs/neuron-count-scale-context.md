# Selected published connectomes — neuron-count scale

PR #101 was narrowed at Lukas’s request on November 12, 2026 to the neuron-count chart shown in his screenshot. All other proposed chart, source, navigation, financing, and export changes were reverted to the PR base.

The existing five observations, source values, publication dates, and coverage qualifiers remain unchanged. Only this chart gains the three anatomical references and the exported observation/date key shown in the screenshot. Source disclosure stays separate from the five dated observations; anatomical counts are not achieved reconstruction completeness.

## Anatomical neuron-count references

These lines describe anatomical population scale, not achieved full-connectome coverage or successful neuron reconstruction. The source values are separate from the dated chart observations.

| Reference | Line value | Primary evidence and retained scope |
| --- | ---: | --- |
| Mouse | 70,890,000 | [Herculano-Houzel et al., 2006, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/): 70.89 ± 10.41 million neurons, mean ± SD. Isotropic fractionation; both hemispheres counted, olfactory bulb included in remaining areas. |
| Rhesus macaque, *Macaca mulatta* | 6,376,160,000 | [Herculano-Houzel et al., 2007, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/): 6,376.16 million neurons. Olfactory bulbs excluded; one hemisphere processed and doubled. This named species is a nonhuman-primate reference, not a universal primate size. |
| Human | 86,100,000,000 | [Azevedo et al., 2009](https://doi.org/10.1002/cne.21974), primary abstract, freshly retrieved through [Europe PMC metadata](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1002/cne.21974&format=json&resultType=core): adult male human brain mean 86.1 ± 8.1 billion NeuN-positive cells. Donor and counting-method scope remain explicit. |

The browser-facing labels round these values and carry ≈. The source disclosure retains the published precision, uncertainty and anatomical exclusions. The numerical values do not imply equal reconstruction completeness across the existing map observations.

## Implementation

`src/data/public-connectomics-context.ts` contains only the anatomical references. `metric-chart-visibility.ts` applies them only to `largest-connectome-neurons`. Native export keys are likewise limited to that plot. No new public-image-resource observation, cost scenario, cross-chart navigation, funding layout, publication context, or global export change remains.
