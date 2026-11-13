# Whole-brain scale and acquisition-budget references

These two optional, default-off modal overlays add scale context to the existing observations. They do not alter the observed dataset, estimate completion percentages, fit a frontier, or project a completion date.

## Common image model

Use a hypothetical dense, single-channel, 8-bit grayscale image at **4 × 4 × 40 nm** sampling. This matches the approximate lateral acquisition sampling and nominal section thickness described in the [MICrONS resource paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11981939/) (EM acquisition / sectioning sections). Sampling alone does not guarantee successful tracing, biological completeness, or equivalence across optical and EM protocols.

For anatomical volume `V` in mm³:

```
voxel_nm3 = 4 * 4 * 40 = 640
N_voxels = V * 10^18 / 640
nominal_raw_PB = N_voxels * 1 byte / 10^15
```

PB is decimal. This is **nominal uncompressed raw-image capacity**, not an expected compressed public download or a measured stored-byte inventory. It excludes image pyramids, overlap/reimaging, acquisition overhead, segmentation, skeletons, other derived products and replicas. Existing public-resource points retain their original encoding/product/report or measurement scopes. These scopes preclude interpreting their ratio to a reference line as a connectome-completion percentage.

## Anatomical inputs

| Reference | Input volume (mm³) | Derived raw PB | Volume source / scope |
|---|---:|---:|---|
| Mouse | 450 | 703.125 | [Mikula, Progress Towards Mammalian Whole-Brain Cellular Connectomics](https://pmc.ncbi.nlm.nih.gov/articles/PMC4927572/), Volume EM: “the adult mouse brain at 450 mm³.” |
| Rhesus macaque | 78,550 | 122,734.375 | [Calabrese et al., A diffusion tensor MRI atlas of the postmortem rhesus macaque brain](https://pmc.ncbi.nlm.nih.gov/articles/PMC4512905/), §4.1 Atlas templates: 10 adolescent–adult postmortem MRI volumes, mean 78.55 ± 5.49 mL, range 69.47–86.63 mL. This is a fixed-specimen cohort mean, not a universal population average; extraction and fixation can affect volume. |
| Human | 1,200,000 | 1,875,000 | [Comparative prospects](https://pmc.ncbi.nlm.nih.gov/articles/PMC11955263/), introductory comparison: human brain volume “in the range of 1,200,000 mm³.” |

The comparative paper's own storage calculation uses **18 nm isotropic** sampling. Its published 85.7 PB / 205.7 EB figures are **not** the values plotted by this overlay, which explicitly uses the separately stated 4 × 4 × 40 nm scenario. Anatomical inputs are approximate even where the arithmetic is exact. Plot labels should be rounded and marked ≈; formulas retain the unrounded derivations.

## Human acquisition-budget targets

Owner-selected budgets are scenarios, not measurements or cost forecasts. Each horizontal line is the per-10M-voxel acquisition price that would imply the selected **image-acquisition-only** budget for the same 1.875 × 10²¹-voxel human model:

```
USD_per_10M_voxels = budget_USD * 10,000,000 / 1.875e21
```

| Human image-acquisition budget | USD per 10M voxels |
|---|---:|
| $1B | 5.333333333333333 × 10⁻⁶ |
| $100M | 5.333333333333333 × 10⁻⁷ |
| $10M | 5.333333333333333 × 10⁻⁸ |
| $1M | 5.333333333333333 × 10⁻⁹ |
| $100K | 5.333333333333333 × 10⁻¹⁰ |

The observed cost points retain the published rough Table A1 estimates and their protocol-specific resolutions/labeling. [Kording et al., arXiv:2603.25713v1, Table A1, p.18](https://arxiv.org/pdf/2603.25713v1) states: “No claim beyond rough size (order of magnitude) is made.” Crossing a target does not demonstrate human-connectome feasibility. Preparation, storage, reconstruction, proofreading and other complete-project costs are outside these acquisition-budget lines.

## Presentation / interaction contract

- Controls exist only in the two supported pop-out charts; previews and observed source tables remain unchanged.
- Both switches start off. Switching back restores the original axis and point geometry.
- Domain limits and observed point positions interpolate in log space. Dotted target lines reveal as space opens; interrupted reversals begin at the current position.
- Reduced-motion preference settles directly. Motion is cancelled on unmount.
- Native exports use the selected settled view, with concise scenario labels; sharing is unavailable during transition rather than exporting a transient scale.
- Existing source inspection, modal focus/history behavior, stable links and access controls remain in force.

Sources independently retrieved November 13, 2026; source quotations and arithmetic were checked separately from the implementation.
