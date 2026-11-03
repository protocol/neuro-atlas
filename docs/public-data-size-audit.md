# Public connectomics data sizes — source audit, November 3, 2026

The chart uses **PB**. Reported TB figures are converted with **1 PB = 1,000 TB = 10¹⁵ bytes**; a publisher's rounded TB/PB claim remains a reported value. Only the MaleCNS entry is an integer-byte object inventory.

The six points describe separate products. Image sizes, loosely scoped resource totals, specimen sizes, sampling and encodings differ. The chart distinguishes their evidence/product basis, keeps the observations unconnected, and dates the new storage measurement explicitly.

## Existing records

| Record | Plotted PB | Primary evidence and date | Verified interpretation |
| --- | ---: | --- | --- |
| Hildebrand larval zebrafish | ≈0.0027 | [Paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC5594570/), online May 10, 2017: “The entire aligned image dataset requires ~2.7 TB of disk space as compressed PNG images” | Multiresolution aligned PNG imagery, including targeted peripheral imagery and small registered reference-atlas components. The separately stated 2.4 TB and 4.9 TB acquisition products have different scope. First public-release date remains unestablished. |
| FAFB, the imagery underlying FlyWire | ≈0.012 | [Paper XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6063995/fullTextXML), online July 19, 2018: “The full 12 TB image volume is downloaded over the Internet.” | Historical public tracing-image product. [Producer instructions](https://www.temca2data.org/data.html) describe the approximately 12 TB image pyramid; the producer downloader extracts JPEG tiles. Approximately 106 TB in the paper describes acquired camera images. The paper's v13 alignment is retired; current instructions recommend v14. A separate lossless PNG product is another encoding of the same specimen. Producer HTTPS download access has an expired-certificate limitation; recovering its text does not prove a working browser download. |
| Hemibrain v1.0 | ≥0.026 | [Producer release post](https://dvid.io/blog/release/): “From the 26+ TB of data, we can generate a compact (25 MB) data model containing the adjacency matrix.” [Release history](https://www.janelia.org/project-team/flyem/hemibrain) dates v1.0 to January 22, 2020. | Broad producer-reported data amount. The encoding, versions, pyramid levels and component membership of 26+ TB are unspecified. Public images and derivatives exist; the project explicitly has CC BY 4.0 licensing. This is a release-post report, rather than an archived exact release-day inventory. The 25 MB graph and 1.2 TB reconstruction-database subset are separate products. |
| H01 human cortex | 1.4 | [Google announcement](https://research.google/blog/a-browsable-petascale-reconstruction-of-the-human-cortex/), June 1, 2021: “a 1.4 petabyte rendering”; caption: “roughly one cubic millimeter of human brain tissue captured in 1.4 petabytes of images.” | Producer-reported image amount, with exact encoding/component byte accounting unspecified. Images and derived products are publicly available, but their existence does not establish that the 1.4 PB includes all derivatives. The current public image product is JPEG at 4 × 4 × 33 nm ([metadata](https://storage.googleapis.com/h01-release/data/20210601/4nm_raw/info)). The 2024 paper describes the same specimen. |
| MICrONS mouse cortex | 1.6 | [Allen announcement](https://alleninstitute.org/news/scientists-complete-largest-wiring-diagram-and-functional-map-of-the-brain-to-date), April 9, 2025: “The wiring diagram and its data ... are 1.6 petabytes in size.” | Producer-reported resource amount, with component byte accounting unspecified. The first public data release was July 2021. The [v117 manifest](https://www.microns-explorer.org/manifests/mm3-v117) separately lists 117 TB and 55 TB for the two fine-aligned EM image products: **172 TB = 0.172 PB** combined. This narrower image-only product scope is distinct from the 1.6 PB headline. Mirrors are the same underlying dataset. |

All five original numerical values, dates, primary citations and quotations are retained. Source notes and product labels are corrected. The chart's ≥ marker remains a conservative lower bound for the publisher's “26+ TB.” The audit does not establish that all five are precise stored-byte inventories or a homogeneous temporal series.

## MaleCNS: measured public JPEG image pyramid

The [official download page](https://male-cns.janelia.org/download/) identifies `gs://flyem-male-cns/em/em-clahe-jpeg` as “The aligned EM volume, contrast-adjusted with CLAHE normalization and JPEG-encoded.” [Image metadata](https://storage.googleapis.com/flyem-male-cns/em/em-clahe-jpeg/info) specifies 8 nm isotropic native sampling and 11 resolution levels.

Measured on **November 3, 2026**:

- Native 8 nm image shards: **44,428,865,656,516 bytes** (44.428865656516 TB).
- All 11 resolution levels plus stored metadata: **50,910,260,068,834 bytes** (**0.050910260068834 PB**).
- **27,594 image shard objects**, plus one **633-byte metadata object**.
- Alternative N5 image encoding, segmentation, meshes, skeletons, tables and database products are outside this image-product total. No image content was downloaded for the measurement.

The plot uses **2026 as the measurement year**, with the exact date in inspection/source tables/export. MaleCNS's initial public release was October 2025; v1.0 on June 8, 2026 refined proofreading and annotations ([release notes](https://male-cns.janelia.org/release/)). This point adds a verified current footprint for an existing specimen, rather than a second acquisition or a claimed original release-day inventory.

### Reproduction

`docs/data/public-data-size/malecns-20261103.json` records per-level totals, source endpoints, byte units and snapshot hash. Its adjacent gzip JSON-lines snapshot preserves every object name and integer size. All 27,594 image-shard records also retain generation and update timestamp. The sole 633-byte `info` metadata row is size-only: those two provenance fields were not captured in the original observation, and none are inferred retrospectively. The summary explicitly records that exception; it does not affect the byte sum. `scripts/research/audit-malecns-image-size.py --snapshot <snapshot.jsonl.gz>` checks the saved integer-byte totals. The same script with `--live --output <directory>` re-enumerates public JSON API metadata without image-body downloads.

The underlying audit also independently traversed the parent prefix via the GCS XML API. All pages were exhausted, with identical object-name sets, counts and byte totals; no duplicate names. Three independent HEAD probes matched stored lengths and generations. Complete original JSON/XML response pages and checks remain in the private task evidence; the committed snapshot and summary are the compact reproducible inventory, not a reconstruction of hypothetical storage.

## Why the latest point is smaller

MaleCNS's [paper](https://www.biorxiv.org/content/10.1101/2025.10.09.680999v2.full) reports **0.082 mm³ including fixative**, with **0.054 mm³ containing tissue**. That entire fly central nervous system occupies much less physical volume than H01's roughly 1 mm³ cortical sample or the roughly cubic-millimeter mouse resource. Whole-specimen coverage and physical size are separate properties.

Product boundaries also matter: the MaleCNS point is a particular JPEG image pyramid, while MICrONS's 1.6 PB is a broader headline. For a closer product comparison, the MICrONS manifest's image-only figure is 0.172 PB. Its date and encoding still differ from the measured MaleCNS product.

A quantitative compression explanation is unestablished. H01's checked public image product also uses JPEG. Three-axis voxel sampling matters: MaleCNS is 8 × 8 × 8 nm, H01 4 × 4 × 33 nm, and checked MICrONS public EM imagery 8 × 8 × 40 nm. Comparing only “4 nm” and “8 nm” would misstate their sampling density. The chart makes no claim of scientific regression, a fixed storage-efficiency gain, or a global cumulative total.

Fish1 and request-gated Fish Fire&Wire/Fish2 remain separate resources. No unsupported byte total or inferred zero is introduced for either.
