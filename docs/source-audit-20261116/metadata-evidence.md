# Neuro Atlas — conservative metadata and founding-note corrections

Baseline: `de2301974ac1e66b35aaaec91198dc5dda8c060c`. Scope: `NA-METADATA-NARROW`, `NA-NEWRONIKA-HQ`, and `NA-FOUNDING-NOTES` only. Nine company rows (12 cells) and four founding-note cells change. All 25 founding years remain unchanged.

## Evidence method and boundaries

Reused the actual original article/homepage bodies saved by the November 16, 2026 source audit in `sources/<SHA-256 of literal URL>.txt`, with retrieval metadata from the corresponding `.json`. Read each passage directly and verified the quoted text below against those bodies. The original source URLs and original capture times are retained below; these are not claims of fresh network retrieval. Body SHA-256 values identify the exact local evidence. Line locators refer to those saved original bodies, not the prior ledger (whose extraction line positions can differ).

Only the listed claims are corrected. Unrelated evidence limitations remain open; an unsupported qualifier is not asserted to be false. The NeuroBionics row is byte-identical to this worker’s base, leaving the parent’s separate clinical/endovascular correction alone. Financing, regulatory markers, timeline records, existing shared goldens, and generated JSON are not part of this patch.

## Source-checked corrections

### Precision — `company-linked-website-005`

`indication`: `Paralysis and neurological disorders` → `Paralysis`.

Source: https://precisionneuro.io
Original capture: `2026-11-16T10:44:43.486073+00:00`; saved body SHA-256: `be99f184a1105129b5ec5d83823f349862c4c9cdb00bc92703232d9116b21739`.

Saved body lines 23–23:

> Today, our system is designed to help people with paralysis operate digital devices using only their thoughts.

The first-application passage establishes paralysis; it does not establish an additional generic neurological-disorders indication. No other Precision field changes.

### Paradromics — `company-linked-website-006`

`modality`: `Connexus Direct Data Interface` → `Connexus BCI`.

Source: https://paradromics.com
Original capture: `2026-11-16T10:44:38.492995+00:00`; saved body SHA-256: `00a432be9bdfe508f5f0d8597a8d833e4d17f3db27d870258803c565ae0ccf33`.

Saved body lines 49–49:

> Now in FDA-authorized human clinical studies, Connexus BCI is a fully implantable, high-data-rate interface designed to translate neural intent into communication.

Use the product name stated in the body; do not infer the expanded Direct Data Interface name.

### Axoft — `company-linked-website-009`

`modality`: `Soft Polymer Electrodes` → `Soft Neural Interface`.

Source: https://axoft.us
Original capture: `2026-11-16T10:44:23.340685+00:00`; saved body SHA-256: `dcb77151a4caea26a6a715d532297e6effb5641d3c0e43e6b09eb3d446965203`.

Saved body lines 12–12:

> Axoft’s first of its kind bioinspired implant mimics the soft tissues of the brain.

Saved body lines 55–55:

> Our material mimics the soft tissues of the brain, improving biocompatibility, data resolution and stability over time.

The implant, softness, and neural interface are supported (the page also says “We are developing a revolutionary seamless interface with the brain.”). Polymer chemistry is not established by this body; no claim is made that the actual material cannot be a polymer.

### Nia Therapeutics — `company-linked-website-012`

`indication`: `Memory loss after brain injury` → `Memory loss`.

Source: https://niatherapeutics.com
Original capture: `2026-11-16T10:44:35.132589+00:00`; saved body SHA-256: `0baad381a2da50c686f843c2de6d5c151ab87e2199ce0a076d000636a468b431`.

Saved body lines 9–9:

> Nia’s mission is to **transform**  treatment for the 27 million Americans living with memory loss through **closed-loop brain stimulation**, while generating neural insights that will **drive the future** of therapies for cognitive disorders.

Saved body lines 30–30:

> Nia Therapeutics has received FDA Breakthrough Device Designation for its AI-guided brain implant designed to treat memory loss through targeted neurostimulation.

The company mission and device passage establish memory loss without limiting its cause to brain injury. Unchanged closed-loop stimulation remains source-supported.

### Coherence Neuro — `company-linked-website-014`

`modality`: `High-channel Neural Interface` → `SOMA Brain-computer Interface`.

Source: https://coherenceneuro.com
Original capture: `2026-11-16T10:44:23.341011+00:00`; saved body SHA-256: `bd57b2f6833bad5a8d958a9b78875ef619d4a1fd216a89b63534850a314fe50c`.

Saved body lines 24–24:

> therapeutic technology

SOMA and the BCI description are explicit; no channel-count metric is supplied here. Preserve `Cancer` exactly. No financing record, investor, Series A, or co-led claim changes.

### NeuroXess — `company-linked-website-018`

`modality`: `High-throughput Flexible BCI` → `Implantable Flexible BCI`.

Source: https://neuroxess.com
Original capture: `2026-11-16T10:44:29.206257+00:00`; saved body SHA-256: `f9f22301243a0b0c01748c51b14da8c2f97d87a0c765266e2d6a2ff8f342cc55`.

Saved body lines 6–6:

> 脑虎科技成立于2021年, 是一家专注于植入式柔性脑机接口的生命科技公司, 已实现脑机接口系统全链条自主研发, 旨在帮助渐冻症、高位截瘫、脑卒中等重症群体重建运动和语言功能，重启人生。

“植入式柔性脑机接口” means implantable flexible brain-computer interface. Preserve motor/speech restoration. Do not convert performance descriptions elsewhere into the previous unspecific high-throughput modality label.

### Gestala — `company-linked-website-021`

`modality`: `Ultrasonic Phased-array BCI` → `Ultrasound BCI`; `indication`: `Brain imaging and therapy` → `Neurological disorders (in development)`.

Source: https://gestala.com
Original capture: `2026-11-16T10:44:23.341474+00:00`; saved body SHA-256: `cc1b15be7c828c3fb27bb72c9c4147a474cc27d56d5084b813d7102fd5e86b5b`.

Saved body lines 14–14:

> Guided by the vision of “Better Brain for Better Humanity,” we are building ultrasound brain-computer interfaces with the potential for whole-brain read and write capabilities. Our mission is to advance the treatment of neurological disorders, deepen our understanding of the brain, and explore the future convergence of neuroscience and artificial intelligence.

“We are building” and the treatment mission support a development-stage target, not an established clinical outcome. The passage does not establish phased-array architecture or brain imaging as its product indication. HQ, depth, and scope are deliberately untouched by this bounded correction; this is not an all-fields verification.

### Motif Neurotech — `company-linked-website-024`

`modality`: `Miniaturized Deep Brain Stimulation` → `DOT Neuromodulation`; `interface_depth`: `Deep Brain` → blank; `indication`: `Treatment-resistant depression` → `Treatment-resistant depression (in development)`.

Source: https://motifneuro.tech
Original capture: `2026-11-16T10:44:23.341845+00:00`; saved body SHA-256: `6fb2f1b71cfc1e2ab430b05b3ef0b4d1f50a9025618fd2063340eeb51292a559`.

Saved body lines 70–70:

> Roughly 1 in 3 people with depression are failed by pharmaceutical interventions. Our first product is designed to help rebalance brain activity for people who suffer from treatment-resistant depression (TRD).

Saved body lines 76–81:

> Introducing DOT
>
> Bioelectronics that measure and regulate mental states at their source.
> -----------------------------------------------------------------------
>
> Cosmetically invisible and delivered in an outpatient procedure, DOT is designed to activate brain networks clinically proven to alleviate symptoms of treatment resistant depression from the comfort of your own home.

DOT bioelectronics and activation of brain networks support neuromodulation and the intended TRD target. Network activation does not locate the hardware in the deep brain. Blank depth means placement is not established by this linked homepage, not that the device is nonimplantable; the existing `Implanted` scope is not changed.

### Newronika — `company-linked-website-016`

`hq`: `Milan, Italy` → `Cologno Monzese (Milan metropolitan area), Italy`.

Source: https://newronika.com
Original capture: `2026-11-16T10:44:29.206257+00:00`; saved body SHA-256: `1bbdfbc1f0eedc3e120e655b3d27dfd118056fe3eac4c8ad99a99b71a5aeb09b`.

Saved body lines 204–212:

> Legal Address
>
> Foro Buonaparte, 57, 20121
> Milano (MI) - Italy
>
> Headquarters
>
> Via Torquato Tasso 1, 20093
> Cologno Monzese (MI) - Italy

The labeled source separates the Milano legal address from the Cologno Monzese headquarters. Metropolitan context is retained, rather than portraying Milan shorthand as a substantive geographic contradiction.

### Blackrock Neurotech — `founding-001`

Keep `2008`. Note becomes: “Company history dates the business to 2008 as Blackrock Microsystems.”

Source: https://blackrockneurotech.com/our-story/
Original capture: `2026-11-16T10:44:23.340685+00:00`; saved body SHA-256: `3f19e5ecf4b5f5c14a6bf90f1dab1bca03eb197dae4cd73237e4bc528746bced`.

Saved body lines 75–75:

> Almost thirty years ago, a young Florian Solzbacher shared his dream with Marcus Gerhardt of harnessing the brain to restore hope to people with disabilities. The two friends went on to start Blackrock Neurotech in 2008.

Saved body lines 105–109:

> 2008
>
> Blackrock Microsystems is founded
>
> Blackrock Microsystems acquires Cyberkinetics, which includes the Utah Array and other interfaces developed at the University of Utah

The 2008 business name is explicitly supported and retained. Trim only the unlinked rebrand aside; do not reinterpret this as a new founding date.

### Neurosoft Bioelectronics — `founding-008`

Keep `2020`. Note becomes: “Startupticker's press-release account explicitly states Neurosoft Bioelectronics was co-founded in 2020.”

Source: https://www.startupticker.ch/en/news/neurosoft-bioelectronics-secures-funds-to-validate-its-brain-implant
Original capture: `2026-11-16T10:47:01.626993+00:00`; saved body SHA-256: `13abc0f33f26f8d7718ba162c0f4c86e2f03195f8b4f01ddc3e7482fce6cd06a`.

Saved body lines 21–22:

> [Neurosoft Bioelectronics](https://neurosoft-bio.com/)
>  was co-founded in 2020 by Nicolas Vachicouras (CEO), Ludovic Serex (COO), Florian Fallegger (CTO), and Stéphanie Lacour (scientific advisor) who are dedicated to transforming the future of implantable electrical interfaces. Neural implants can be used to diagnose and treat neurological diseases by recording or electrically stimulating neural tissues. However, the long-term success of current neural interfaces is limited by the mechanical mismatch between stiff electronics and soft living tissues. This mismatch causes poor contact between the implant and the underlying tissue and leads to incorrect stimulation, inaccurate recordings, and scarring. 

The article is dated January 29, 2021, and labels its account “(Press release/RAN).” Remove claims about separate Venturelab/PitchBook records, unresolved discrepancy, and corroboration that this linked article does not itself establish. No assertion is made that those separate records are false.

### Neuracle Technology — `founding-017`

Keep `2011`. Note becomes: “Investor HSG states that Neuracle was founded in 2011.”

Source: https://www.hsgcap.com/companies/neuracle/
Original capture: `2026-11-16T10:45:17.161039+00:00`; saved body SHA-256: `6b38a61c7d5d0974d739afb798597a6d7d21acb96156045586177a70224e135f`.

Saved body lines 6–7:

> [Neuracle](https://www.hsgcap.com/companies/neuracle/)
>  is a brain-computer interface (BCI) company developing technologies that connect neural activity with computers and other external systems. Founded in 2011, the company develops non-invasive, minimally invasive, and invasive BCI technologies for scientific research as well as the diagnosis, treatment, and rehabilitation of neurological conditions.

Saved body lines 18–18:

> *   Founded 2011

The profile supports the year but does not alone verify Changzhou-versus-Shanghai identity or all unrelated-namesake exclusions. Remove only those extra assertions.

### Forest Neurotech — `founding-022`

Keep `2023`. Note becomes: “Convergent Research lists Forest Neurotech as a focused research organization (FRO), established in 2023.”

Source: https://www.convergentresearch.org/ecosystem/forest
Original capture: `2026-11-16T10:45:13.180476+00:00`; saved body SHA-256: `bef5cd7b056928c26ee0d16092b97b26e667c8cbbd840e947d30c3db6bf670bb`.

Saved body lines 10–20:

> FRO
>
> Forest Neurotech
>
> Ultrasound technology, whole-brain health
>
> [Visit website](https://forestneurotech.org/)
>
> Established
>
> 2023

Retain the explicit FRO label and establishment year. Remove nonprofit status and conventional-venture-capital characterization that are not established by this specific source.

## Strict TDD receipts

Each vertical slice appended only its own company/note regression, ran the real canonical-data test to an expected assertion failure, changed only that row’s authorized cells, and reran the cumulative file GREEN. Every test also checks the real `buildFundingIndex` in-memory output; no generated artifact is needed by this test.

Command for every RED/GREEN pair: `node --test tests/source-audit-metadata.test.mjs`.

| Slice, in execution order | RED exit | RED pass/fail | GREEN exit | GREEN pass/fail |
|---|---:|---:|---:|---:|
| Precision | 1 | 0/1 | 0 | 1/0 |
| Paradromics | 1 | 1/1 | 0 | 2/0 |
| Axoft | 1 | 2/1 | 0 | 3/0 |
| Nia Therapeutics | 1 | 3/1 | 0 | 4/0 |
| Coherence Neuro | 1 | 4/1 | 0 | 5/0 |
| NeuroXess | 1 | 5/1 | 0 | 6/0 |
| Gestala | 1 | 6/1 | 0 | 7/0 |
| Motif Neurotech | 1 | 7/1 | 0 | 8/0 |
| Newronika | 1 | 8/1 | 0 | 9/0 |
| Blackrock Neurotech | 1 | 9/1 | 0 | 10/0 |
| Neurosoft Bioelectronics | 1 | 10/1 | 0 | 11/0 |
| Neuracle Technology | 1 | 11/1 | 0 | 12/0 |
| Forest Neurotech | 1 | 12/1 | 0 | 13/0 |

The RED failure was the old CSV value versus the required source-backed replacement (`ERR_ASSERTION`), not an import/runtime error. Gestala and Motif are company-level slices covering their related modality/indication/depth cells; founding slices additionally assert the retained supported year.

Final bounded regression receipts:

- Scoped metadata file: 13 tests pass, 0 fail.
- Metadata plus unchanged Precision source regressions: `node --test tests/source-audit-metadata.test.mjs tests/precision-funding-source.test.mjs` → 15 tests pass, 0 fail.
- Additional existing funding-index/founding/Precision regressions ran: 31 tests pass, 0 fail. Qualification: the attempted negative `--test-name-pattern` did **not** exclude the existing generator tests in this runtime; those tests transiently regenerated `src/data/funding-index.json` in this isolated worktree. Immediately restored that exact task-produced file from the pinned base, reran the 15 non-generating regressions above, and rechecked all out-of-scope tracked bytes. No generated JSON change is retained or committed. This is not a full-suite, hosted-page, or production verification.

## Unchanged-data receipts

Compared actual CSV values and raw row bytes with `git show de2301974ac1e66b35aaaec91198dc5dda8c060c:<path>`:

- Company roster/order/header: 25 rows unchanged; exactly 9 authorized rows / 12 authorized cells change. All 16 other rows are byte-identical, including the complete NeuroBionics row. All 188 other company cells are unchanged; Coherence retains `Cancer`.
- Founding roster/order/header: 25 rows unchanged; exactly four `note` cells change. All 21 other rows are byte-identical; all 25 years, source URLs, source kinds, and review dates are unchanged (146 unchanged cells).
- All other tracked files are byte-identical to the pinned base, including funding rounds/financing, regulatory and timeline CSVs, generated JSON, and shared test goldens.
- The real in-memory builder produces identical `rounds`, `milestones`, `investors`, `summary`, and `methodology` before/after: 41 financing events, 15 regulatory markers, and 158 investor aggregates. All 25 derived founding years match both the base and the unchanged shared founding-year fixture.

| Canonical file | Base SHA-256 | Corrected SHA-256 |
|---|---|---|
| `data/funding-index/companies.csv` | `c32de73ebb0a42779bf25d47bdc87f61f15c555d1353c023e85c1e983a348de6` | `c9839503cd04f1924e658dcc4724583851e15b05af599b6af1145065960e2410` |
| `data/funding-index/foundings.csv` | `668a6e397bfedd859eedf705dec165cbd4cbbca9b1b107a9153f7c3adaee2f88` | `54852a5c8802e483f934ded00cae17f3fc0006b32100ad1c09aeaa97ec963928` |

No external write, PR creation, merge, publication, broader general audit, or new critic was performed by this worker. The parent owns integration and PR delivery.
