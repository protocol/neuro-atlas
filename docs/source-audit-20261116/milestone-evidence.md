# Neuro Atlas Milestones source corrections — November 16, 2026

## Scope

Baseline: `de2301974ac1e66b35aaaec91198dc5dda8c060c`.

Six confirmed corrections affect six records in `data/market-memo-q1-2026/milestones.csv` and the corresponding Synchron and INBRAIN records in `data/funding-index/milestones.csv`. Every replacement matched one complete old record. Original source URLs, unrelated columns, row order, headers, and every unrelated row remain unchanged.

The regression tests import the existing `parseCsv` from `scripts/lib/funding-index.mjs` and read the actual canonical CSVs. They do not test copied fixtures or generated JSON. No `date_basis` column, schema/UI change, generated artifact, or other data correction is included. Date-basis/precision presentation and regeneration remain integration work for the coordinating change.

## Evidence and exact changes

Evidence was read from the original-source bodies saved by the November 16 audit, not inferred from the audit verdicts. Capture identifiers below are the SHA-256 of each literal original URL; the corresponding `.json` stores retrieval metadata and `.txt` stores the source body. Line numbers refer to those saved `.txt` bodies.

### 1. Envoy Medical — proceeds at closing, not maximum contingent proceeds

- Audit record: `timeline-005`; canonical timeline line 6.
- [Original company release, February 12, 2026](https://ir.envoymedical.com/news-events/press-releases/detail/80/envoy-medical-announces-closing-of-up-to-78-0-million-upsized-public-offering).
- Capture: `4f6f412b3fcf7355ed7685d3743e84be7157719eed5a57d6c8ed789d99dd00e1.txt`; retrieved `2026-11-16T10:44:23.341845+00:00`; lines 4, 12, 20.

> The aggregate gross proceeds to Envoy Medical from the offering were approximately $30.0 million, before deducting the placement agent's fees and other offering expenses payable by Envoy Medical.

> The potential additional gross proceeds to Envoy Medical from the Series A-1 common warrants and Series A-2 common warrants, if fully-exercised on a cash basis following the Stockholder Approval Date, will be approximately $48.0 million.

> No assurance can be given that any of such Series A-1 common warrants or Series A-2 common warrants will be exercised for cash or exercised at all.

Changed only `activity` (`$78m` → `$30m`), `amount_usd_m` (`78` → `30`), and `note`. The note retains up to $48m of contingent warrant proceeds and explicitly excludes them from the plotted amount. The February 12 closing date is unchanged.

### 2. Synchron — preparing a pivotal trial, not trial initiation

- Audit record: `timeline-011`; canonical timeline line 12 and funding-index line 8.
- [Original Tech Times article, June 6, 2026](https://www.techtimes.com/articles/317929/20260606/synchron-brain-implant-targets-2026-pivotal-trial-first-fda-approved-bci.htm).
- Capture: `392fcd059ce8fd2a243494a79d29c588b65a40f41ba1231fa71493a31d5141ef.txt`; retrieved `2026-11-16T10:47:01.626993+00:00`; lines 8, 23–26.

> is preparing a pivotal clinical trial in 2026

> That is the company's stated goal and regulatory path, not a milestone it has already reached.

The article discusses first-PMA ambitions conditionally; it does not establish that a pivotal trial had started on June 6. It calls the Series D announced on November 6, not closed on that date. Changed timeline `activity` to `pivotal planned`, funding `marker` to `Pivotal (planned)`, and both notes to preparation language. Removed the initiation, priority/PMA, and financing-close assertions from these milestone notes. Both dates remain June 6, explicitly identified in the notes as the article date, not a trial-start date.

### 3. Phantom Neuro — Australian approval to begin CYBORG

- Audit record: `timeline-023`; canonical timeline line 24.
- [Original Inside BCI article, April 15, 2026](https://insidebci.com/news/2026-04-15-phantom-neuro-gets-green-light-for-first-human-trial-of-its-subcutaneous-prosthetic-sensor/).
- Capture: `9bf223b8941bc0fb652a6fe1bb0f278055e3e164b79f37ca50ed35e2d0af6220.txt`; retrieved `2026-11-16T10:44:23.341656+00:00`; lines 1, 11.

> Phantom Neuro, based in Austin, Texas, has received approval to begin its first-in-human clinical trial of Phantom X, a subcutaneous sensor array designed to be implanted in the residual limb of people with below-elbow amputations.

> The study, called CYBORG, will enrol up to ten participants at Cabrini Health in Melbourne, Australia.

> The company is based in Austin, Texas, and the approval is to run the study in Australia.

The last passage is from the article's October 16 correction of its earlier FDA claim. Changed only `activity` (`FIH` → `FIH approved`) and `note`. The note now identifies Australian study authorization to begin CYBORG, retains the supported subcutaneous sensor description and site, drops the unsupported EMG specification, and says it is not a completed implantation. The April 15 article date is unchanged.

### 4. MintNeuro / Motif Neurotech — April 30 partnership announcement

- Audit record: `timeline-028`; canonical timeline line 29.
- [Original MintNeuro release via PR Newswire](https://www.prnewswire.com/news-releases/mintneuro-and-motif-neurotech-partner-to-advance-miniature-brain-computer-interface-therapy-for-mental-health-302758663.html).
- Capture: `f243a4d1ccf23649fe51322d9053c7a22dd4c814b41c875aa5d5405d0bd56049.txt`; retrieved `2026-11-16T10:46:50.906060+00:00`; line 8.

> LONDON, April 30, 2026 /PRNewswire/

> today announced a new strategic partnership that will unite MintNeuro's specialised neural interface chip technology with Motif's clinical-stage therapeutic implant platform

Changed only `date` (`2026-05-01` → `2026-04-30`) and `note`. Retained the partnership description, removed the outdated memo visual-omission/out-of-window qualifier, and kept day precision.

### 5. Neuralink — January 28 implantation versus January 29 announcement

- Audit record: `timeline-029`; canonical timeline line 30.
- [Original Fortune / Associated Press article, January 30, 2024](https://fortune.com/2024/01/30/elon-musk-first-human-neuralink-implant-recovering-well).
- Capture: `e2e1e70a30ac9e684a7b0711b525f544f755f5568efe6703d9bf9c3dd49100d3.txt`; retrieved `2026-11-16T10:44:23.341474+00:00`; lines 93, 107–115, 123.

> January 30, 2024, 2:00 PM ET

> Musk said that the patient received the implant the day prior and was “recovering well.”

> Neuralink reposted Musk’s Monday post on X, but did not publish any additional statements acknowledging the human implant.

The body places the report in a Monday post and the implantation the day before. Calendar verification maps that Monday to January 29, 2024, and the preceding Sunday to January 28, 2024. Changed only `date` (`2024-01-29` → `2024-01-28`) and `note` to distinguish the implantation from the January 29 announcement. Day precision is unchanged. This correction preserves the pre-existing N1 / Telepathy (PRIME) naming; it does not independently re-verify every product/study alias.

### 6. INBRAIN Neuroelectronics — January 2024 TAP enrollment, month precision

- Audit record: `timeline-032`; canonical timeline line 33 and funding-index line 12.
- [Original INBRAIN company timeline](https://inbrain-neuroelectronics.com/).
- Capture: `e41b5edf4c280536a0e84cb7ffc87b5a67b8fdcfbc54a2c8516a973275833966.txt`; retrieved `2026-11-16T10:44:23.341656+00:00`; lines 142–146.

> 2024, January

> Accepted into FDA Total Product Life Cycle Advisory Program (TAP).

Changed timeline `date` and funding `announced_on` from `2024-03-01` to `2024-01-01`, and changed both notes. Both records retain `date_precision=month`; January 1 is only the schema's internal month anchor, not an evidenced event day. Both notes say January 2024 and that the exact day was not disclosed. Removed the unsubstantiated digest-under-March rationalization.

## Strict TDD receipts

Each behavior was added to `tests/source-audit-milestone-data.test.mjs`, run to an expected assertion failure against the still-unfixed canonical record, minimally corrected, and rerun to GREEN before adding the next behavior.

Command for every RED and GREEN:

```sh
node --test tests/source-audit-milestone-data.test.mjs
```

| Slice | Observed RED (exit 1) | Observed GREEN (exit 0) |
| --- | --- | --- |
| Envoy | `78 !== 30`; 0 pass, 1 fail | 1 pass, 0 fail |
| Synchron | `pivotal` versus `pivotal planned`; 1 pass, 1 fail | 2 pass, 0 fail |
| Phantom | `FIH` versus `FIH approved`; 2 pass, 1 fail | 3 pass, 0 fail |
| MintNeuro / Motif | `2026-05-01` versus `2026-04-30`; 3 pass, 1 fail | 4 pass, 0 fail |
| Neuralink | `2024-01-29` versus `2024-01-28`; 4 pass, 1 fail | 5 pass, 0 fail |
| INBRAIN | `2024-03-01` versus `2024-01-01`; 5 pass, 1 fail | 6 pass, 0 fail |

Additional read-only regression command:

```sh
node --test --test-skip-pattern '^canonical founding research covers' tests/funding-founding.test.mjs tests/source-audit-milestone-data.test.mjs
```

Result: **11 tests passed, 0 failed**, exit 0. The excluded existing test executes `scripts/generate-derived.mjs`; it was deliberately not run because this worker must not write generated JSON. The full application suite, generated-data checks, UI verification, and schema integration are not claimed by this data-only change.

## Literal-preservation verification

A byte-level comparison against the pinned baseline verified:

- Timeline: 90 records, exactly 6 changed; all 84 unrelated records byte-identical.
- Funding milestones: 15 records, exactly 2 changed; all 13 unrelated records byte-identical.
- For each changed record, raw CSV field tokens differ only in the explicitly listed fields above. Header bytes, row order, source URL tokens, and every other field are unchanged.
- `git diff --check` passed. No generation command was run.
