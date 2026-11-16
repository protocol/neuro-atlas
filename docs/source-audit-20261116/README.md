# Neuro Atlas — source-support corrections (November 16, 2026)

Base: `de2301974ac1e66b35aaaec91198dc5dda8c060c`. Applies the owner-requested fixes from the Milestones / BCI Funding Index source audit. This branch is a correction PR, not authorization to merge or publish.

## What changes

- Corrects Envoy proceeds ($30m, not the $78m contingent ceiling), Synchron planned pivotal-trial status, Phantom Australian study authorization, INBRAIN January 2024 TAP, Motif–MintNeuro April 30 announcement, and Neuralink January 28 implantation versus January 29 announcement.
- Corrects Neuracle round-specific investors from the actual source; attributes Forest’s $14m commitment only to Eric Schmidt, not separately named company supporters. Keeps NeuroXess angel + pre-Series A as one combined financing disclosure without inventing an allocation. Normalizes only the verified NTI capitalization alias.
- Labels event / announcement / report dates separately; preserves month precision and explicitly marks unverified legacy date positions. Clinical / regulatory does not imply a trial is already running.
- Labels financing totals as disclosed financing including explicit commitments, not cash receipts. Penumbra remains an acquisition agreement at $14.5b enterprise value, separate from financing. Grant/performer awards remain excluded from financing totals.
- Narrows unsupported stage, product, ownership, use-of-proceeds, and metadata qualifiers; retains all 25 founding years. Binds the Layer 7-T temporary-use restriction directly to the actual FDA clearance letter.

## Full fix-group disposition

All 34 grouped actionable findings have an implemented correction, a source-bound narrowing, or an explicit evidence-status guard. “Implemented” is not an all-clear for every original claim; unresolved source/FX limits are retained below.

| Finding | Records | Implementation |
|---|---|---|
| `NA-ENVOY` — Envoy: completed gross proceeds $30m, not the $78m ceiling | timeline-005 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-SYNCHRON` — Synchron: pivotal study preparing/planned, not initiated | timeline-011, funding-regulatory-007 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-PHANTOM` — Phantom: approval to run Australian study, not FDA approval | timeline-023 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-INBRAIN` — INBRAIN: January 2024 TAP, month precision | timeline-032, funding-regulatory-011 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEUROXESS-COMBINED` — NeuroXess: one combined angel + pre-Series A disclosure | funding-round-030 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-MINTNEURO` — Motif–MintNeuro: April 30 announcement | timeline-028 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEURALINK-FIRST` — Neuralink: January 28 implantation vs January 29 announcement | timeline-029 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEUROBIONICS-CLINICAL` — NeuroBionics: clinical evStim differs from research fibers | company-linked-website-011 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-INVESTOR-ALIAS` — Neurotechnology Investors case-only alias | funding-round-002, funding-round-003, funding-round-004, funding-round-005 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEURACLE-INVESTORS` — Neuracle: replace unsupported current-round investors | funding-round-029 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-PENUMBRA` — Penumbra: definitive agreement and enterprise value | timeline-001 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-STAGES` — Remove financing-stage specificity not present in sources | timeline-012, funding-round-034, timeline-049, funding-round-024, timeline-050, funding-round-029, funding-round-022, funding-round-001 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-ENSPIRE` — Enspire: Cleveland Clinic portfolio company, not proven spinout | timeline-013 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-MOTIF-AWARD` — Motif ARPA-H performer selection: award instrument and individual amount undisclosed | timeline-018 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-SECOND-CASES` — Second implantation/case: conservative category narrowing | timeline-020, timeline-024 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-CORTEC-TIMING` — CorTec BDD day and historical-first overclaim | timeline-021, funding-regulatory-003 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEUROXESS-PRIOR` — NeuroXess: end-of-2025 prior case, not established December/battery event | timeline-024 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-UNLINKED-ASIDES` — Remove unsupported descriptive asides, not supported core events | timeline-006, timeline-025, timeline-044, timeline-062, timeline-074 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-BLINDSIGHT` — Blindsight vision aim does not establish cortical placement | timeline-036, funding-regulatory-010 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-CONVOY` — CONVOY feasibility vs formal early-feasibility designation | timeline-038 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-SUBSENSE` — SubSense: additional financing, not proven seed extension | timeline-058 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEUROBIONICS-CLOSE` — NeuroBionics: one $5m close does not establish later $10m seed story | timeline-059, funding-round-023 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-TETHER` — Tether investment is not proof of majority ownership | timeline-061, funding-round-001 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-LAYER7-RESULT` — Layer 7 speech accuracy: contributing participant count not given | timeline-081 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-METADATA-NARROW` — Narrow modality/indication to what actual bodies establish | company-linked-website-005, company-linked-website-006, company-linked-website-009, company-linked-website-012, company-linked-website-014, company-linked-website-018, company-linked-website-021, company-linked-website-024 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-NEWRONIKA-HQ` — Newronika: headquarters vs legal address | company-linked-website-016 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-FOUNDING-NOTES` — Keep supported founding years; trim unlinked identity/database qualifiers | founding-001, founding-008, founding-017, founding-022 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-PRECISION-CITATION` — Retain prior FDA correction and cite the actual FDA PDF | timeline-041 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-DATE-BASIS` — Source dates are not automatically underlying-event dates | timeline-006, timeline-012, timeline-013, timeline-018, timeline-020, timeline-024, timeline-031, timeline-035, timeline-036, timeline-039, timeline-040, timeline-042, timeline-043, timeline-044, timeline-045, timeline-049, timeline-050, timeline-054, timeline-059, timeline-060, timeline-061, timeline-065, timeline-066, timeline-068, timeline-069, timeline-070, funding-round-018, funding-round-024, funding-round-029, funding-round-032, funding-round-033, funding-round-034 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-MONTH-PRECISION` — Month-only disclosures/publications must not display day 1 | timeline-073, timeline-081 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-DATE-GUARD` — Render precision and date evidence honestly | timeline-004, timeline-017, timeline-023, timeline-027, timeline-034, timeline-037, timeline-047, timeline-058, timeline-062, funding-round-003, funding-round-007, funding-round-022, funding-round-026, funding-round-038, funding-regulatory-012 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-REGULATORY-LANE` — Clinical lane is not proof of active clinical trial | timeline-032, timeline-035, timeline-036 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-ROUNDING` — Do not truncate source amounts in numeric capital inputs | timeline-012, timeline-013, timeline-047 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |
| `NA-COMMITMENT-LABEL` — Do not render funding commitments as completed cash raised | timeline-048, funding-round-035 | Implemented; exact data deltas and source passages are pinned in the fixtures and evidence notes. |

## Evidence and regression design

- [Six core milestone corrections](milestone-evidence.md) retain exact issuer/reporting passages and the original capture provenance.
- [Metadata and founding-note evidence](metadata-evidence.md) documents the conservative profile changes without changing founding years.
- `tests/fixtures/source-audit-records-20261116.json` binds each additional record correction to literal source passages. Its 26 record-level slices were each run RED → minimal data change → GREEN.
- `tests/fixtures/source-audit-delta-20261116.json` permits only exact reviewed fields. Historical Notables goldens were **not rehashed**: a test-only helper first asserts each new value, then restores only its old fields in a clone for the original digest. Unlisted fields still reach the old golden unchanged.
- [Date-basis ledger](date-basis-review.json) records the final stored dates, precision, literal citation URLs and event/announcement/report/unverified basis.
- [Machine-readable disposition](fix-disposition.json) maps all original actionable fix groups to stable audit records.

## Deliberately retained / not “fixed” by invention

- Inaccessible original articles are not declared false or verified. The original audit reported 56 records with at least one unreadable field across 43 literal URLs; these are **baseline audit counts**, not a new final-branch availability census. Readable issuer syndication is identified as such, not independent reporting.
- Legacy Neuracle (~$8.5m), StairMed (~$73m), and CorTec (~$14.4m) USD estimates lack established FX provenance in the reviewed body. Their limitations are visible rather than assigned invented rates or dates. CorTec’s captured native amount remains unverified as well.
- Unverified date positions are retained for traceability with an explicit label, not converted into claimed actual-day events. Source dates and true event dates remain distinct.
- Coherence’s $45m Series A/co-led wording is valid first-party **subheading** evidence; it was not removed because the earlier audit looked too narrowly at article-body wording.
- NeuroXess’s separate 2026 CNY700m Series B conversion already has a real, pinned Federal Reserve H.10 source; it is unchanged.
- No passwords/auth, hosting, unrelated charts, automatic jobs, or public access settings change. No merger/deployment claim is made by this implementation document.

## Internal arithmetic

The Funding Index remains 25 companies, 41 financing records and 15 regulatory markers. The $14m Forest commitment and the combined NeuroXess disclosure each enter the disclosed-financing sum once, not as receipts or invented constituent rounds. NTI resolves to four distinct financing appearances / one company / $325m whole-record associated capital, not check size.

| Year | Before all-neurotech disclosed financing (USD m) | After (USD m) | Before BCI (USD m) | After (USD m) |
|---|---:|---:|---:|---:|
| 2024 | 460.00 | 459.75 | 360.50 | 360.50 |
| 2025 | 1,173.00 | 1,173.00 | 1,079.00 | 1,079.00 |
| 2026 | 1,209.51 | 1,162.41 | 1,069.51 | 1,070.11 |

Envoy alone removes $48m of contingent warrant proceeds from the 2026 all-neurotech input. Other small changes preserve disclosed precision rather than summing rounded labels. Penumbra’s $14.5b enterprise value never enters these capital-lane sums.

## Verification

The source-bound and field-delta regressions pass locally. Final full-suite comparison, production build, native desktop/mobile evidence and independent reviews are recorded at PR handoff; this file does not treat a pending check as passed.
