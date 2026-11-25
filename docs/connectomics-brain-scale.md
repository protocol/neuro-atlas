# Whole-brain scale and acquisition-budget references

These optional, default-off overlays add scale context to the existing observations. They do not alter the observed dataset, estimate completion percentages, fit a frontier, or project a completion date.

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

## Single human acquisition reference ($1B)

The acquisition-efficiency chart offers one **default-off, illustrative $1B image-acquisition-only scenario**, available only in **voxels per dollar**. It is a reference, not an observation, cost forecast or future crossing date. The same human model uses 1,200,000 mm³ at 4 × 4 × 40 nm, giving **H = 1.875 × 10²¹ voxels (~1.9 sextillion)**:

```
reference_voxels_per_dollar = H / 1e9
                           = 1.875e12 voxels/$
```

The reference label rounds this to **$1B · 1.88T**. There is no five-budget ladder. Selecting **$ per voxel** clears the reference state from the URL and immediately returns to historical bounds; the reciprocal view and its shared/exported state do not retain an active reference. The preview always shows historical efficiency with the reference off.

Point details separately retain the illustrative human-brain acquisition-cost conversion `H / source_estimated_voxels_per_dollar`. The 10 observed efficiencies preserve the published rough Table A1 estimates and protocol-specific resolutions/labeling. [Kording et al., arXiv:2603.25713v1, Table A1, p.18](https://arxiv.org/pdf/2603.25713v1) states: “No claim beyond rough size (order of magnitude) is made.” Optical/EM resolutions, biological scope and cost definitions differ: neither the reference nor the detail conversion is a matched whole-brain project budget or demonstration of human-connectome feasibility. Preparation, reconstruction, proofreading and storage are excluded. The ExA-SPIM author-estimate/citation-mismatch and PEEM prospective qualifications remain explicit.

## Tissue-volume and nominal-voxel views

The standalone tissue plot reuses the same mouse (≈0.45 cm³), rhesus macaque (≈78.55 cm³) and human (≈1,200 cm³) volume assumptions. The optional voxel view transforms the displayed volume by `cm³ × 10²¹ / 640`; approximate dense reference capacities are 7.0 × 10¹⁷, 1.2 × 10²⁰ and 1.9 × 10²¹ voxels respectively. MICrONS uses ≈4 nm acquired pixels and nominal 40 nm sections; aligned imagery was generated at 8 nm laterally. The model describes nominal acquisition grid capacity only. Source observations and tables retain their individual tissue and volume bases in cm³.

## Presentation / interaction contract

- Controls exist on the supported expanded charts; previews and original source tables remain unchanged.
- All switches start off. Switching back restores the original axis and point geometry.
- Domain limits and observed point positions interpolate in log space. Dotted target lines reveal as space opens; interrupted reversals begin at the current position.
- Reduced-motion preference settles directly. Motion is cancelled on unmount.
- The existing footprint and acquisition-budget native exports use the selected settled view. Standalone tissue exploration PNGs are unavailable; use Copy link to share those selected views.
- Existing source inspection, modal focus/history behavior, stable links and access controls remain in force.

Sources independently retrieved November 13, 2026; source quotations and arithmetic were checked separately from the implementation.
