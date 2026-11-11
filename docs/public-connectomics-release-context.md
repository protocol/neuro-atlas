# Public connectomics: release dates and anatomical scale

Source check: November 11, 2026. This update is additive to the [November 3 byte-footprint audit](public-data-size-audit.md); the archived observations and MaleCNS inventory remain unchanged.

## Implemented

- The public-footprint chart now includes a **July 2021 MICrONS v117 image-product observation: approximately 0.172 PB**. The producer's release manifest lists 117 TB for Minnie65 and 55 TB for Minnie35 fine-aligned EM image products. The sum includes these two distinct portions once each; AWS/Google mirrors, segmentations and other derived products are excluded.
- **H01 remains at June 2021 / 1.4 PB.** Its dated producer announcement explicitly says the dataset is being released. The 2024 paper is later work on the same specimen.
- **MICrONS's 2025 / 1.6 PB report remains a separate observation.** It covers the broader wiring-diagram resource and has unspecified component byte membership. Moving that later headline to 2021 would assert an unsupported historical product total.
- **MaleCNS remains at November 3, 2026 / 0.050910260068834 PB**, the date and value of the measured JPEG image pyramid. Its initial specimen release was October 2025. Later measured bytes are not substituted for release-day storage.
- The x-axis explicitly distinguishes **release / report / measurement year**. The seven points are unconnected, with product and date basis retained in labels, source tables and export evidence.
- The footprint detail links directly to the existing **neuron-count view**. This is a separate mapping-scope measurement, rather than a conversion of byte footprints. That existing chart keeps its five observations, publication dates and completeness qualifiers, and gains three faint dashed anatomical count references on its own count axis. The references have a separate source disclosure and do not increase the connectome-observation count.

## Release evidence and limits

| Resource/product | Date basis | Primary evidence checked | Interpretation |
| --- | --- | --- | --- |
| H01 rendering / reported imagery | June 1, 2021 release announcement | [Google Research](https://research.google/blog/a-browsable-petascale-reconstruction-of-the-human-cortex/): “Today ... we are releasing the ‘H01’ dataset, a 1.4 petabyte rendering”; caption reports 1.4 petabytes of images. | Retain 1.4 PB in 2021. This is a producer-reported amount, with exact encoded-product byte membership unspecified. |
| MICrONS v117 fine-aligned EM imagery | July 2021 first public release; month precision | [Release manifest](https://www.microns-explorer.org/manifests/mm3-v117): “first public data released ... in July 2021”; Minnie65 “Precompute Image Data (117 TB)”; Minnie35 “Precomputed Image (55 TB)”. | 117 + 55 = 172 TB = 0.172 PB, using decimal units. This is a release-manifest report, not a preserved release-day object inventory. Minnie65 includes a multiresolution pyramid from 8 × 8 × 40 nm. |
| MICrONS broader resource | April 9, 2025 report | [Allen Institute](https://alleninstitute.org/news/scientists-complete-largest-wiring-diagram-and-functional-map-of-the-brain-to-date): “The wiring diagram and its data ... are 1.6 petabytes in size.” | Same specimen, broader product boundary, later report. Do not sum the 2021 and 2025 observations. |
| Hemibrain v1.0 | January 22, 2020 release report | [DVID release post](https://dvid.io/blog/release/) and [Janelia release history](https://www.janelia.org/project-team/flyem/hemibrain). | Retain the ≥26 TB report and its existing component-scope uncertainty. |
| Hildebrand larval zebrafish compressed aligned imagery | May 10, 2017 publication | [Author manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC5594570/): aligned data are public; “The entire aligned image dataset requires ~2.7 TB ... as compressed PNG images.” | Publication supplies an availability checkpoint, not proof of the first public-release day. Retain the publication date and ≈2.7 TB. |
| FAFB tracing image download | July 19, 2018 publication checkpoint | Existing [paper citation](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6063995/fullTextXML) retained. The producer download site's expired TLS certificate was still encountered during this check. | First public-release day and a fresh successful producer download remain unverified. Preserve the historical ≈12 TB publication observation; no new release-day assertion is made. |
| MaleCNS JPEG pyramid | November 3, 2026 byte measurement | Existing [inventory audit](public-data-size-audit.md#malecns-measured-public-jpeg-image-pyramid); current [project page](https://male-cns.janelia.org/) and [release notes](https://male-cns.janelia.org/release/). | The project page dates v0.9 to October 3, 2025; release notes say October 5. Use October 2025 precision for initial availability. Neither page establishes this JPEG prefix's release-day stored bytes. |

The MICrONS June 11, 2021 date on the current project page describes the v117 segmentation's proofreading state. Its release manifest explicitly identifies July 2021 as the first public release. These are different events.

## Anatomical neuron-count references

These lines describe anatomical population scale, not achieved full-connectome coverage or successful neuron reconstruction. The source values are separate from the dated chart observations.

| Reference | Line value | Primary evidence and retained scope |
| --- | ---: | --- |
| Mouse | 70,890,000 | [Herculano-Houzel et al., 2006, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC1567708/): 70.89 ± 10.41 million neurons, mean ± SD. Isotropic fractionation; both hemispheres counted, olfactory bulb included in remaining areas. |
| Rhesus macaque, *Macaca mulatta* | 6,376,160,000 | [Herculano-Houzel et al., 2007, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC1805542/): 6,376.16 million neurons. Olfactory bulbs excluded; one hemisphere processed and doubled. This named species is a nonhuman-primate reference, not a universal primate size. |
| Human | 86,100,000,000 | [Azevedo et al., 2009](https://doi.org/10.1002/cne.21974), primary abstract, freshly retrieved through [Europe PMC metadata](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1002/cne.21974&format=json&resultType=core): adult male human brain mean 86.1 ± 8.1 billion NeuN-positive cells. Donor and counting-method scope remain explicit. |

The browser-facing labels round these values and carry ≈. The source disclosure retains the published precision, uncertainty and anatomical exclusions. The numerical values do not imply equal reconstruction completeness across the existing map observations.

## Deliberately deferred

- **Whole-brain PB target lines:** a physical brain volume or neuron count does not specify a storage footprint. Defensible byte scenarios would need a named species/volume, three-axis voxel sampling, bit depth, tissue/mask assumptions, compression and pyramid factors, and explicit included image/derived products. The anatomical count view supplies usable scale context without manufacturing those assumptions.
- **Last-12-month or cross-resource extrapolation:** the seven footprint observations mix different specimens, sampling, encodings and product boundaries. The last-12-month window also includes a later inventory of an older specimen. A growth fit would confound measurement timing and product scope. No fit, projected crossing or extrapolation switch is added.
- **A matched resource-by-resource neuron-axis switch:** the existing count chart has independently sourced counts with its own dates and completeness. It is linked as a separate view, not silently treated as counts of every byte product. A fully matched alternative would require reconciling each exact release/reconstruction version, cell-versus-neuron denominators, specimen coverage and truncation/proofreading criteria, including H01 and MaleCNS.
- **Global cumulative bytes or a “flat since 2021” claim:** the selected checkpoints are neither a census nor additive, and the same specimen appears in multiple reports. Neither claim is supported.
- Exact release-day object inventories, the FAFB first-release date, Fish1's total footprint and request-restricted Fish2 remain open as described in the earlier audit.

## Reproduction

The additive observation and primary-count references live in `src/data/public-connectomics-context.ts`; `metric-chart-visibility.ts` projects them without rewriting `draft-chart-evidence.json`. The original archive's byte hash and historical scientific golden remain asserted independently. Focused regression tests cover release/product identity, exact preservation of all six prior footprint observations, source-table counts, reference geometry, separate observation/reference inventories and navigation to the existing related view.

Native browser layout, real PNG raster/clipboard acceptance, full-suite integration and release review are separate checks; this source audit does not claim them.
