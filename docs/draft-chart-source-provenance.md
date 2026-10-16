# Draft-chart source provenance — October 16, 2026

Only public scientific sources are represented here. This is a curation record, not a claim of new experimental measurements or integrated browser verification.

## Tissue and neuronal counts

H01 and MICrONS retain their existing raw x/y coordinates. The annotations distinguish approximately 1 mm³ human tissue released June 1, 2021 ([Google Research](https://research.google/blog/a-browsable-petascale-reconstruction-of-the-human-cortex/)) and mouse tissue released July 2021 ([MICrONS v117](https://microns-explorer.org/manifests/mm3-v117)). Later publications are not independent tissue acquisitions.

[Lee et al., Nature 2016, nature17192](https://www.nature.com/articles/nature17192), Table 1, states “Excitatory neuronal targets 1278 Presynaptic neurons 130 Postsynaptic partners 1228.” The [public author manuscript](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4844839/fullTextXML) establishes the targeted reconstruction and boundaries. Use x=2016 (publication year; online March 28), y=1,278. Targets are not complete neurons; dendrites terminate at soma or sample boundary, and input axons were not retrogradely traced. The analysed middle region is 450 × 450 × 50 µm, not the entire 450 × 450 × 150 µm imaged volume. Categories overlap and are not summed. Grouping with partial mouse cortex is descriptive, not an assertion of equivalent completeness. Neuronal counts are not spatial complexity or comparable complete maps.

## Acquisition economics

Source: [Compiling molecular ultrastructure into neural dynamics, arXiv:2603.25713v1](https://arxiv.org/pdf/2603.25713v1), Table A1, PDF page 18. The table says: “Many of these numbers come from a crowdsourcing effort: we thank the many involved scientists for providing estimates of these numbers. No claim beyond rough size (order of magnitude) is made.”

The [11-row archival transcription](data/acquisition-economics-table-a1.json) retains original row-level caveats, source URLs and values, including excluded rows. Its original `include_in_optical_em_plot` metadata is archival, not the current inclusion policy: the curated plot explicitly excludes `exaspim2024` and `xray2024`. Nine plotted points use the **Approx. Voxels/$ column exactly**, not a recalculation from rounded hourly costs and throughput. Every point carries ≈. Years are as printed, not inferred acquisition or equipment-launch dates.

- Optical: ExM + confocal (2015), ExLLSM (2019), ExA-SPIM (2023), mesoSPIM (2024).
- Electron microscopy: single-beam SEM (2018), MultiSEM 506 (2023), MultiSEM 706 (2025), bdTEM (2024).
- PEEM (table year 2024) is a separate **prospective** group: the cited 2025 [PNAS paper](https://www.pnas.org/doi/10.1073/pnas.2521349122) mixes demonstrations with projected sustained throughput.
- ExA-SPIM 2024 is excluded because reference 54 identifies HiExM, not ExA-SPIM. X-ray micro-CT is excluded because it is neither optical nor electron microscopy.
- Table A1 versus Figure 2: mesoSPIM is tabulated but not visibly plotted; TEMCA is plotted but absent from the table; MultiSEM 706 is tabulated at 10⁹ voxels/$ but appears near 2×10⁹ in the figure. Table values are authoritative for this transcription, not a claim that the mismatch is resolved.

Voxels differ in sampling, optical resolution, expansion, labels and biological information. Cost composition, amortization, utilization and price-year are not established. These are rough author estimates, **not measured all-in costs** and not normalized native-tissue-volume efficiency. No fit, doubling line, error bar or inferred TEMCA dollar point is added. Historical SBF-SEM and electron-tomography sources lack matched dollar accounting; no costs are fabricated. The original acquisition-rates panel is unchanged.

## Reconstruction errors

[Schmidt et al., RoboEM, Nature Methods 2024](https://www.nature.com/articles/s41592-024-02226-5), Figure 2b, supplies a [publisher-hosted source workbook](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-024-02226-5/MediaObjects/41592_2024_2226_MOESM6_ESM.xlsx). Twelve exact operating points are retained: four H01 human multiSEM, five Si150L4 mouse multiSEM and three mouse SBEM. x is splits/mm; y is merges/mm, intentionally transposing the paper's axes. Source sheet/row, stored decimals and complete protocol notes remain on each point and in the regression fixture.

Human evaluation uses five random/densely seeded axons, 1.4 mm of cable; not the separate 6.5-mm soma-seeded evaluation. Mouse multiSEM uses five axons/1.7 mm; mouse SBEM ten axons/1.7 mm. Merge detection uses >2.2 µm excursions; baseline merges count 0.5 per neurite, new multiSEM RoboEM mergers count 1. Splits require >2.5 µm overlap with ground truth. No uncertainty interval is supplied. Compare methods within each dataset, not as pooled historical benchmarks. No reciprocal-split-rate conversion to nERL is valid; existing PATHFINDER nERL is retained separately.

[ConnectomeBench2, arXiv:2606.21116v1, Figure 2](https://arxiv.org/html/2606.21116v1) contains ROC/classifier performance and training/view scaling, **not errors/mm**. No exact underlying Figure 2 coordinate table was recovered in the inspected public archive/repository. RoboEM is an explicitly different source, not a silent substitution or a digitization of ConnectomeBench2.

## Proofreading and the missing labor denominator

The [MICrONS resource paper](https://www.nature.com/articles/s41586-025-08790-w) reports 1,433 proofread axons with varying extension and 84,035 individually segmented neurons: a descriptive ratio ≈1.7%, not equivalent completed neurons or a volume/labor completion fraction. Reported proofreading is in subvolume 65. The 85 fully extended axon-and-dendrite example cohort is not an exhaustive complete-neuron total.

[NeuVue v1 (2022)](https://www.biorxiv.org/content/10.1101/2022.07.18.500521v1.full) reports 3,740 cumulative hours and approximately 3,600 campaign hours for multi-soma correction. [NeuVue v2 (May 2026)](https://www.biorxiv.org/content/10.1101/2022.07.18.500521v2.full) reports 2,451 Minnie65 hours, dominated by merge correction and cleanup. The versions differ; do not sum, average or silently replace them. The revised permissive completeness screen sets no axonal lower bounds and does not certify fully correct neurons.

There is no matched labor numerator for full axonal/dendritic completion across the dense volume. Dividing merge-cleanup hours by the axon subset fraction, treating seven project years as proofreading time, or assuming a work-year conversion would manufacture a result. No total MICrONS numeric point or full-volume extrapolation is added. Existing Hemibrain and FlyWire effort values are unchanged.

## Reproducibility

`tests/draft-source-curation.test.mjs` pins release annotations/raw coordinates, the 2016 target count, the nine economic values and exclusions, full-precision RoboEM values/notes, proofreading non-extrapolation, 19 candidates, five gaps, 23 numeric panels and 79 observations. The categorical timeline retains two events. Share targets are additive, with all existing IDs retained. Run `node --import tsx --test tests/draft-source-curation.test.mjs tests/draft-evidence.test.mjs tests/draft-chart-links.test.mjs`, then `npm run typecheck`. Integrated build/browser verification is separate.
