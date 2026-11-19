# Selected connectomics source additions

The Mapping Scale charts use **EM Datasets, shared by Forrest Collman**, as a discovery catalog: https://docs.google.com/spreadsheets/d/1PukHvhxTqC72tau9HDnq1LKIl3F6V_FGr_y3G-jjZ-k/edit#gid=0 . The catalog credit appears separately in both charts’ Sources, selected-data JSON and image-export notes. Each numerical observation links to its original paper.

## Curated checkpoints

`src/data/connectomics-backfill.ts` is the compact source catalog and constructs these six observations. Dates identify the cited publication/version. The charts retain their existing scatter-only presentation and source-specific completeness notes.

| Observation | Publication/version | Value and scope | Catalog row | Primary evidence |
|---|---|---|---:|---|
| White, *C. elegans* | November 12, 1986, print | 302 canonical hermaphrodite neurons; composite of overlapping specimen series, incorporating earlier pharyngeal work | 9 | [White et al.](https://doi.org/10.1098/rstb.1986.0056), abstract and Methods |
| Helmstaedter mouse retina | August 7, 2013, online | 950 neuronal reconstructions: 840 classified neurons and 110 orphans, with 173 glia separate; boundary-truncated | 28 | [Helmstaedter et al.](https://www.nature.com/articles/nature12346), abstract, main text and Methods |
| Ryan, *Ciona* larval CNS | December 6, 2016, online | 177 reconstructed CNS neurons among 301 imaged CNS cells; rostral and caudal omissions | 39 | [Ryan et al.](https://elifesciences.org/articles/16962), abstract and Results |
| MaleCNS | October 30, 2025, preprint v2 | 166,691 proofread and annotated neurons across adult male fly brain and nerve cord, including sensory axons | 115 | [Berg et al., v2](https://www.biorxiv.org/content/10.1101/2025.10.09.680999v2.full), whole-CNS inventory |
| Eyewire II | June 1, 2026, preprint v1 | >25,000 retinal neurons, derived from the abstract’s counts of >8,000 bipolar, 13,000 amacrine and 4,000 retinal ganglion cells after human proofreading | 124 | [Stroeh et al., v1](https://www.biorxiv.org/content/10.64898/2026.05.28.727403v1), abstract |
| Helmstaedter retina imaged volume | August 7, 2013, online | ≈132 × 114 × 80 µm = 1,203,840 µm³ = 0.00120384 mm³ = 0.00000120384 cm³; unexpanded, processed-tissue bounds | 28 | [Helmstaedter et al.](https://www.nature.com/articles/nature12346), Methods, Data acquisition ([author-hosted final PDF](https://brain.mpg.de/307140/2013_Helmstaedter___Denk_W_Nature.pdf), page 8) |

The retina volume is calculated from the paper’s approximate physical dimensions. It retains processed-tissue coordinates; a living-tissue shrinkage correction is unspecified. Existing imagery and release records stay in place. The additions span heterogeneous specimens and reconstruction criteria, so they remain individual observations.

## MICrONS clarification

The existing [MICrONS paper](https://www.nature.com/articles/s41586-025-08790-w) observation stays at **84,035 individually segmented neurons**. The source catalog’s row 75 lists **120,000**. The relation between the two values remains open for clarification with Forrest. The catalog value has not replaced the paper-defined observation.

## Selection boundary

This is a representative, primary-checked selection from the supplied catalog. The sheet’s other rows retain their original status as research leads. Cell censuses, soma-containing fragments, neuronal reconstructions and glial-inclusive counts require their own reconciliation before any further additions. Each selected record stores the species, region, imaging method, count/volume scope, source version/date, literal quotation and catalog row.
