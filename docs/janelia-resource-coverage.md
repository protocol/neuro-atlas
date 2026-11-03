# Janelia resource-size coverage — updated November 3, 2026

The MaleCNS image-product gap from the October 29 review is resolved by a reproducible public-storage inventory. The five earlier reported sizes remain unchanged; a sixth, explicitly measurement-dated point covers MaleCNS JPEG imagery. Full source review and reproducibility: [public data size audit](public-data-size-audit.md). Fish Fire&Wire access findings below retain their October 29 evidence date.

## MaleCNS

A distinct male Drosophila specimen. The [official download page](https://male-cns.janelia.org/download/) identifies public aligned EM and derivative products. A November 3, 2026 inventory establishes **50,910,260,068,834 stored bytes (0.050910260068834 PB)** for the complete CLAHE/JPEG image pyramid, including all 11 resolution levels. Native 8 nm imagery is **44,428,865,656,516 bytes**. Two independent metadata listing APIs agree. The [audit and compact inventory](public-data-size-audit.md) preserve the exact scope: alternative N5 imagery, segmentation, meshes, skeletons and tables are separate products.

The [release notes](https://male-cns.janelia.org/release/) list v0.9 in October 2025 and v1.0 on June 8, 2026. The [project page](https://www.janelia.org/project-team/flyem/male-cns-connectome) gives October 3 for the first release; release notes give October 5. Preserve month precision rather than selecting a day. v1.0 describes minor proofreading changes and annotation refinement, not a new specimen. The [Cell paper](https://www.sciencedirect.com/science/article/pii/S0092867426009426) was published September 3, 2026.

The paper reports “The final 160 teravoxels (including fixative) occupied 0.082 mm3 total volume of which 0.054 mm3 contains tissue.” Teravoxels are not a published TB figure. The [aligned N5 metadata](https://storage.googleapis.com/flyem_cns_z0720_07m_dvidcoords_n5/s0/attributes.json) gives a full rectangular grid and `uint8` with gzip encoding. Multiplying grid dimensions by bytes per voxel would describe dense nominal capacity including background—not actual compressed stored/downloaded bytes, and not the acquisition-stage 160-teravoxel denominator. Neither conversion is plotted as a reported footprint.

## Fish Fire&Wire (Fish2)

The [current project policy](https://www.janelia.org/fish-firewire) states:

> We have therefore created a process for research labs to request access to the current “snapshot.”

> Access is provided on the condition that papers or preprints using this data will not be submitted before December 1, 2027.

> Because this access is intended for the requesting investigator and their research group, please direct other interested researchers to fill out the form rather than redistributing the data.

This does not meet this plot's open-access-resource scope. No primary byte footprint was verified either. Google's [neural-mapping project timeline](https://sites.research.google/gr/neural-mapping/) distinguishes Fire&Wire/Fish2 from [Fish1](https://fish1-release.storage.googleapis.com/index.html); neither is the older Hildebrand dataset already plotted. A [September 2026 announcement](https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/) does not override the project's specific access conditions.

## Reconsideration rule

Add a point only when a primary source or reproducible inventory establishes a matched byte basis and availability/publication date. Record the product, version, compression and imagery/derivative scope; do not count release revisions or mirrors as independent acquired resources. For Fish2, revisit access eligibility independently of size. No images were downloaded or access requests submitted for this review.
