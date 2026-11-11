# Human acquisition-budget guides and reconstruction-cost evidence

## Acquisition scenario

The acquisition-cost plot keeps its original source-estimate default and its dollars-per-10M-voxels unit. Its expanded view offers an optional **Show human acquisition-budget targets** control. Five dashed guides represent hypothetical acquisition-only budgets of $1B, $100M, $10M, $1M, and $100K. Enabling them extends the logarithmic axis below the source estimates; disabling them restores the exact default SVG geometry. Existing source points, values, dates, quotations, and protocol distinctions are unchanged.

The guides use **1,200 cm³** as a whole-human tissue-volume planning assumption. [Collins et al. (2025), *Comparative prospects of imaging methods for whole-brain mammalian connectomics*](https://www.cell.com/cell-reports-methods/fulltext/S2667-2375(25)00024-4) states a human-brain volume “in the range of 1,200,000 mm³.” This is a published planning scale, rather than an individual specimen measurement. The accessible [Europe PMC publisher full-text XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11955263/fullTextXML) corroborates the statement when publisher HTML is unavailable.

Sampling is **4 × 4 × 40 nm, anisotropic**, using the 4-nm montage pixel size and 40-nm section thickness documented in [Yin et al. (2020)](https://www.nature.com/articles/s41467-020-18659-3), Methods. This is a mouse EM protocol applied as an explicit human-volume scenario. The z dimension is retained; 4-nm isotropic sampling would change the voxel count tenfold. Voxel sampling is distinct from optical resolution.

With 1 cm = 10⁷ nm:

```
N = tissueVolumeCm3 × 10²¹ / (dx_nm × dy_nm × dz_nm)
  = 1,200 × 10²¹ / (4 × 4 × 40)
  = 1.875 × 10²¹ voxels

Target $/10M voxels = acquisitionBudgetDollars × 10,000,000 / N
```

| Hypothetical acquisition budget | Target $/10M voxels (rounded) |
| --- | ---: |
| $1B | 5.333 × 10⁻⁶ |
| $100M | 5.333 × 10⁻⁷ |
| $10M | 5.333 × 10⁻⁸ |
| $1M | 5.333 × 10⁻⁹ |
| $100K | 5.333 × 10⁻¹⁰ |

The calculation assumes one pass through all tissue, without overhead for overlap, reacquisition, preparation-induced volume change, expansion, tissue loss, storage, compute, reconstruction, or proofreading. These stages need separate budgets. It assumes no acquisition year or achieved whole-human reconstruction. Each source estimate retains its own resolution, labeling, and biological scope; comparisons against optical or other EM protocols require separate validation. Enabled image exports visibly retain the hypothetical scenario and geometry, and carry source URLs and calculation in nonvisual evidence. The original [Table A1 acquisition estimates](https://arxiv.org/pdf/2603.25713v1) remain the plotted input.

## Reconstruction and proofreading evidence

A source-linked evidence disclosure is attached to the populated acquisition and project-proofreading plots. No empty metric card or fabricated whole-volume dollar series is added.

- [Hemibrain (2020)](https://elifesciences.org/articles/57443): over 50 person-years of proofreading for a partial fly brain. The primary [Europe PMC XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7546738/fullTextXML) confirms the claim.
- [FlyWire (2024)](https://www.nature.com/articles/s41586-024-07558-y): approximately 33 person-years, an author estimate based on timed edits and a 2,000-hour work year (Methods, “Quantification of proofreading effort”). Retain project-specific completeness and synapse attachment.
- [MICrONS (2025)](https://www.nature.com/articles/s41586-025-08790-w): 1,433 neurons with proofread axons of varying extension among 84,035 individually segmented neurons; all proofreading was in subvolume 65. This does not supply complete-volume labor accounting.
- [NeuVue v2 (2026)](https://www.biorxiv.org/content/10.1101/2022.07.18.500521v2.full): 2,451 logged hours across 36,447 tasks; the completeness screen has no axonal lower bounds. [v1 (2022)](https://www.biorxiv.org/content/10.1101/2022.07.18.500521v1.full) reports 3,740 cumulative hours and overlapping work. Versions and task scopes stay separate.
- [RoboEM (2024)](https://www.nature.com/articles/s41592-024-02226-5) supplies actual source-backed **modeled compute-cost estimates**, displayed as a scoped table instead of a chronological frontier. Its [Source Data Fig. 1 workbook](https://static-content.springer.com/esm/art%3A10.1038%2Fs41592-024-02226-5/MediaObjects/41592_2024_2226_MOESM5_ESM.xlsx), sheet `Fig 1i`, cells C2:C5, gives 3903.572290653618, 1199.4311111111112, 265.81487564871304, and 49.362962962963003 EUR/m for FFN, Motta et al. 2019, LSD, and RoboEM correction respectively. [Supplementary Note 1.4 and Table 4](https://static-content.springer.com/esm/art%3A10.1038%2Fs41592-024-02226-5/MediaObjects/41592_2024_2226_MOESM1_ESM.pdf) normalize dataset sizes to 2.7 meters of neurites, estimate hardware-equivalent EC2 rates, and use 1 USD ≈ 1 EUR. RoboEM's total runtime is extrapolated from measured benchmark tasks. It is correction-only compute added to an existing segmentation; the other rows cover larger processing pipelines and have different quality/completeness. The printed workbook years are method labels, not comparable annual observations.

A comparable whole-volume dollar series remains a research gap: it needs realized labor/compute expenses, currency and price year, specimen/tissue volume, task boundaries, completeness and quality thresholds, and consistent treatment of storage/acquisition. The existing effort and reconstruction-accuracy plots remain intact.

## Verification boundary

Strict test-first slices cover scenario arithmetic, opt-in/default restoration, the real Download PNG callback's serialized SVG/evidence, and the scoped evidence disclosure. The callback test captures the real serialization at the browser raster boundary; it does not claim native raster or recipient-paste validation. Native browser/PNG inspection and independent review are separate integration checks. No authentication, hosting, or source-data files change.
