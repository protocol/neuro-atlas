PASS — No source-located factual errors or material omissions found in the requested participant/hour claims.

# Neuro Atlas independent source review

**Reviewed:** `/opt/data/projects/neuro-atlas-hours-participants-20261120/docs/recording-hours-coverage.md`, lines 1–78. Source/documentation verdict only; not an implementation, rendered-chart, export, or release verdict. Read actual primary-source bodies and independently reconciled their figures; did not use the parent-created expected manifest or derived-audit JSON as proof.

## Evidence checked

### TUSZ — all eight release rows match

Document lines 21–28 agree exactly with the dates, Total Duration (Hours), Patients and Sessions columns of the [maintainer paper, Table 1, PDF page 1](https://isip.piconepress.com/conferences/ieee_spmb/2020/papers/p01_10.pdf). Independently parsed the actual fetched table and compared every tuple:

| Release | Date | Hours | Patients | Sessions |
| --- | --- | ---: | ---: | ---: |
| v1.0.0 | 2017-04-17 | 170 | 114 | 510 |
| v1.1.0 | 2017-08-04 | 425 | 246 | 686 |
| v1.2.0 | 2018-04-15 | 504 | 315 | 822 |
| v1.3.0 | 2018-08-16 | 651 | 364 | 970 |
| v1.4.0 | 2018-11-14 | 651 | 364 | 969 |
| v1.5.0 | 2019-07-22 | 1,074 | 692 | 1,661 |
| v1.5.1 | 2020-04-23 | 1,074 | 692 | 1,575 |
| v1.5.2 | 2020-05-09 | 1,074 | 692 | 2,608 |

The fetched maintainer material also explicitly distinguishes train/dev/eval and says “The eval set is not released to the public.” Document line 30 correctly treats Table 1 as full-corpus figures, not public-training totals; it neither sums overlapping releases nor substitutes one release's session count for another.

### AJILE12 — matched frozen release, no invented duration range

Document lines 34–38 match the [frozen DANDI metadata](https://api.dandiarchive.org/api/dandisets/000055/versions/0.220127.0436/): `assetsSummary.numberOfSubjects` is `12`; its description states “for a total of 1280 hours”; `datePublished` is `2022-01-27T04:36:51.269746+00:00`. These are reported metadata/prose, not a newly audited asset-duration total.

The [descriptor, Abstract and Background & Summary](https://www.nature.com/articles/s41597-022-01280-y), reports 1,280 hours/12 participants, “55 semi-continuous days,” and “3–5 recording days each (55 days total).” The document correctly refuses to convert the latter into exact session counts, continuous hours, or a 72–120-hour range. The publisher's article information confirms April 21, 2022, distinct from the frozen release date.

### POYO-1 — animal unit and strict bounds preserved

Document line 42 matches the [original paper, Abstract](https://arxiv.org/html/2310.16046v1): “seven nonhuman primates, spanning over 158 different sessions of recording” and “over 100 hours of recordings.” The introduction identifies existing open electrophysiology datasets. No animal is counted as a person; neither bound is collapsed to an exact value, and no per-animal duration or new-data-collection claim is invented.

### Neuralink — unknown denominator and nested subset preserved

Document lines 46–52 match the first-party article text in the supplied article-specific JavaScript module, linked by the canonical HTML's module-preload tag. The [article](https://neuralink.com/updates/pretraining-on-50000-hours/), Calibration section, says participants streamed “over 50,000 hours of unlabeled, freeform neural data” and its “first participant alone has recorded over 9,000 hours.” The exact corpus contributor count is not disclosed; six performance-record participants are a different analysis group. The document correctly keeps >9,000 hours inside, not additional to, >50,000 hours.

The Future directions section explicitly says all live-use results came from models pretrained on a single participant's data; it also discusses multi-participant experiments without establishing a shared model trained on the entire corpus. Document line 50 respects that distinction. The module's visible October 1, 2026 date agrees with canonical `article:published_time`.

### JapanEEG — arithmetic and versioned access correction supported

Document lines 56–72 match the [v2 Abstract, Tables 3–4 and Data Availability](https://arxiv.org/html/2606.01264v2). The [submission history](https://arxiv.org/abs/2606.01264v2) confirms May 31, 2026 v1 and November 17, 2026 v2. The [v1 Abstract](https://arxiv.org/html/2606.01264v1) actually claimed OpenNeuro/CC0; v2 instead specifies Harvard Dataverse, controlled research access and voice-masked audio.

Table 4 defines `rec hours` before event segmentation and says: “The covert repetition rows share the same recordings, so their rec hours are counted once in the total.” Independent decimal sums of its actual cells, excluding the repeated 168.5-hour recording, give **P01 813.8 h, P02 146.2 h, P03 60.3 h; total 1,020.3 h**. Table 3 separately reports **1,020.4 h**, while the abstract reports **1,020 h from three speakers**. The document labels its ≈60–814 h range as calculated and retains these distinct source precisions without inventing session lengths.

## Limits and inference check

No trial enrollment was substituted for a recording denominator; no contributor count was presented as demographic representativeness or demonstrated cross-person generalization; no recording-day or longitudinal per-person total was presented as a continuous session.

Dataverse access remains **author-reported**, not asset/manifest verification. This review's non-browser DOI request resolved to Harvard Dataverse but returned HTTP 202 with no body. The document's earlier HTTP 403/browser-policy observations were not independently replayed; neither those observations nor this probe establishes restricted-file access. No browser, tests, builds, code edits, messages, or restricted-asset inspection were performed. The only deliberately created review artifact is this report.
