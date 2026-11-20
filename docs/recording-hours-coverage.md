# Recording hours and participant coverage

Source audit: November 20, 2026. This change augments the existing selected-dataset recording-hours chart; it does not create a new inventory, pooled total, or quality ranking.

## Counting contract

Pair each reported recording duration with the number of people or animals contributing to that exact dataset/release. Trial enrollment, implanted recipients, decoder-performance participants, recording sessions, files, and recording days are different denominators. Unknown contributor counts remain unknown.

Hours measure recording volume. Contributor counts measure coverage across individuals, not demographic representativeness or demonstrated cross-person generalization. Per-person totals can comprise many discontinuous sessions. Simultaneous electrodes, EEG/EMG/audio streams, overlapping releases and reused training data are not additional independent recording hours.

The existing twelve point identities, coordinates, duration values, qualifiers and checkpoint dates are preserved. Source-backed coverage and current access context are additional evidence. The archived provider snapshot and original evidence JSON remain unchanged. No route, fragment identity, hosting configuration or access-control change is required.

## Matched source evidence

### TUSZ: release-specific patients and sessions

[Maintainer release history, Table 1](https://isip.piconepress.com/conferences/ieee_spmb/2020/papers/p01_10.pdf) reports all three measures together:

| Release | Release date | Recording hours | Patients | Sessions |
| --- | --- | ---: | ---: | ---: |
| v1.0.0 | 2017-04-17 | 170 | 114 | 510 |
| v1.1.0 | 2017-08-04 | 425 | 246 | 686 |
| v1.2.0 | 2018-04-15 | 504 | 315 | 822 |
| v1.3.0 | 2018-08-16 | 651 | 364 | 970 |
| v1.4.0 | 2018-11-14 | 651 | 364 | 969 |
| v1.5.0 | 2019-07-22 | 1,074 | 692 | 1,661 |
| v1.5.1 | 2020-04-23 | 1,074 | 692 | 1,575 |
| v1.5.2 | 2020-05-09 | 1,074 | 692 | 2,608 |

These are full-corpus figures, including held-out evaluation, not public-training-partition totals. Releases overlap and must not be summed. Session counts can change without a change in reported duration or patient count; use the actual release row rather than carrying a latest session count backward.

### AJILE12: frozen-release contributor count

The [frozen DANDI 000055/0.220127.0436 metadata](https://api.dandiarchive.org/api/dandisets/000055/versions/0.220127.0436/) reports `assetsSummary.numberOfSubjects: 12` and states:

> Neural recordings are available at 500 Hz from at least 64 electrodes per participant, for a total of 1280 hours.

The [Scientific Data descriptor](https://www.nature.com/articles/s41597-022-01280-y) describes 3–5 recording days per participant, 55 semi-continuous days total, and the same 1,280 hours/12 participants. Recording days are not exact recording-session counts or gap-free/QC-valid hour ranges. Do not turn 3–5 days into a 72–120-hour claim. The plotted date remains the frozen archive release, January 27, 2022, not the paper's April 21 publication.

### POYO-1: nonhuman-primate training corpus

The [original paper](https://arxiv.org/abs/2310.16046) describes seven nonhuman primates, over 158 recording sessions and over 100 hours. Retain both strict lower bounds and the animal unit. This is integration/reuse of existing neural recordings for model training, not new collection or a wholly open new release. No per-animal duration distribution is inferred.

### Neuralink: contributor count not disclosed

The [October 1, 2026 company disclosure](https://neuralink.com/updates/pretraining-on-50000-hours/) says:

> In the two years since our clinical trial began, our participants have streamed over 50,000 hours of unlabeled, freeform neural data. Our first participant alone has recorded over 9,000 hours …

The exact count of contributors to the >50,000-hour corpus is not given. The first participant's hours are a subset, not an additional total. The six participants described as achieving performance records and a separate trial/implant recipient count are not this recording denominator. Formal session-union, recording-gap and QC rules remain unspecified. The data are company-held; the disclosed live-use results use participant-specific pretraining, not a demonstrated pooled model trained on the entire corpus.

The live canonical page is a JavaScript-rendered shell. Its article-specific module-preload asset contains the first-party article text; the asset URL was discovered from the live HTML rather than guessed. The visible article date and canonical metadata agree on October 1, 2026.

### JapanEEG: three contributors, uneven longitudinal depth

The [November 17, 2026 v2 descriptor](https://arxiv.org/html/2606.01264v2) still reports 1,020 hours from three speakers. It now describes controlled research access through [Harvard Dataverse](https://doi.org/10.7910/DVN/5RM3OT), with voice-masked speech audio, rather than the older OpenNeuro/CC0 release claim. This is an author-reported access description: the DOI resolved to Harvard Dataverse, but direct retrieval returned 403 and the authorized browser's organizational policy blocked that host. Restricted files, completed research access and a complete release manifest were not inspected.

Keep the existing May 31, 2026 initial-descriptor checkpoint and plotted 1,020-hour value. The later revision is a separately dated supporting reference, not an invented new collection date or a backdated access claim.

[Table 4](https://arxiv.org/html/2606.01264v2#Sx2.T4) supplies recording hours by participant/task/device. Its caption explicitly states:

> The covert repetition rows share the same recordings, so their rec hours are counted once in the total.

Sum the `rec hours` column by participant, counting those shared 168.5 hours once, not the event-hour column:

| Participant | Included recording-hour cells | Calculated total |
| --- | --- | ---: |
| P01 | 346.6 + 134.6 + 168.5 + 153.9 + 10.2 | 813.8 h |
| P02 | 23.7 + 122.5 | 146.2 h |
| P03 | 60.3 | 60.3 h |

A concise derived range is **≈60–814 h per participant (calculated from Table 4)**. It is not a directly quoted publisher summary, a typical session length, or continuous recording time. The displayed rounded cells sum to 1,020.3 hours, while Table 3 reports 1,020.4 and the abstract reports 1,020. Retain those source precisions instead of altering a cell to force equality. No median or mean is presented as a directly reported statistic.

## Presentation and verification

Implementation should keep coverage discoverable in the full comparison, selected-point readouts, accessible point labels and source table. Standalone PNGs must retain the paired duration/contributor values, including Neuralink's unknown denominator, POYO's animal unit and both greater-than duration qualifiers. Keep compact preview sizing and historical chart links intact.

Verification status: implementation/native review in progress. No production release or merge is authorized by this PR.
