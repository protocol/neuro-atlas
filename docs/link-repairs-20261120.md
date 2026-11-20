# Neuro Atlas link repairs — November 20, 2026

## Scope

Repair the broken or wrong destinations established by the same-day site-wide link audit, using bodies actually retrieved from the replacements. This is a best-effort correction, **not an all-links-working certificate**. The audit at `b6f99efaa80251c4fbbe608a329776617ae383ac` had 587 source entries: 485 loaded, 90 unverified, eight broken/unusable, two publisher errors and two suspect news destinations. The 90 access-limited links are not indiscriminately replaced or declared dead.

The source catalog, canonical CSVs, derived Funding/Milestones data and schema producer are changed together. No route, fragment, redirect, measurement value, dataset byte count or financing amount changes. No merge, production deployment, recurring checker, access change or subscription purchase is included.

## Verified destination changes

| Original problem | Working replacement and limit |
| --- | --- |
| Science's April 2025 Axios financing URL produces a missing-page body | [SEC filing index](https://www.sec.gov/Archives/edgar/data/1873836/000187383625000001/0001873836-25-000001-index.htm), with its [Form D](https://www.sec.gov/Archives/edgar/data/1873836/000187383625000001/xslFormDX01/primary_doc.xml). [Crunchbase News](https://news.crunchbase.com/venture/braintech-ai-startup-science-neuralink-alums-seriesc/) separately supports the Khosla lead. See the claim-level [provenance addendum](../data/funding-index/link-repair-provenance.md). |
| NeuCyber's standalone domain does not resolve | [CIBR institutional profile](https://en.cibr.ac.cn/detail/cibrNewsnews/b8dbf43633cc4311a9798874fb0d435e), explicitly labeled “Institutional profile (CIBR).” This is not a verified standalone company homepage. |
| SubSense's old domain has a certificate hostname mismatch | [Official SubSense website](https://subsense-bci.com/). Both company identity and substantive homepage content were read. |
| The 2024 funding snapshot slug is wrong | [Same publisher's 2024 Neurotech Funding Snapshot](https://neurotechnology.substack.com/p/2024-funding-snapshot). Public article introduction and identity were read; additional content is paywalled. |
| TEMCA2 producer instructions have an expired certificate | [Pinned Bock Lab downloader documentation](https://github.com/bocklab/temca2-catmaid/blob/7449966d688e3d8adc9455bd93d0fca84bad410a/download/README.md), explicitly describing the historical ~12 TB traceable dataset. Not proof that a full dataset download succeeds or that current alignment versions are unchanged. |
| Schema reference points to a nonpublic repository | [Immutable public Neuro Atlas schema](https://github.com/protocol/neuro-atlas/blob/b6f99efaa80251c4fbbe608a329776617ae383ac/src/lib/field-velocity/schema.ts), byte-identical to the referenced schema. No visibility change. |
| Paradromics' 2018 Business Wire URL returns generic Newsroom content | [BioSpace's syndicated issuer release](https://www.biospace.com/brain-machine-interface-company-paradromics-secures-a-7-million-series-seed-led-by-arkitekt-ventures), including the $7m round and the same named investors. This is syndication, not independent reporting. |
| SubSense's December 2025 Business Wire identifier does not match the retrieved announcement | [BioSpace's syndicated issuer release](https://www.biospace.com/press-releases/subsense-expands-financing-to-27-million-to-accelerate-r-d-for-non-surgical-brain-computer-interfaces), explicitly separating $10m new capital from $27m cumulative financing. |
| Kim et al. DOI resolves to an IOP application error | [Europe PMC abstract for PMID 19015583](https://europepmc.org/article/MED/19015583), displaying the exact same DOI and substantive abstract. |
| Weber et al. DOI resolves to an IOP application error | [Europe PMC abstract for PMID 17873416](https://europepmc.org/article/MED/17873416), displaying the exact same DOI and substantive abstract. |

Replacement bodies above were re-read on November 20, 2026. PubMed itself returned a cookie-required gate for both studies, so those PubMed links were **not** substituted. The two Europe PMC pages delivered actual matching abstracts; full-text availability is not implied. The frozen Stevenson–Kording CSV/JSON, original DOIs, row IDs, neuron counts and selection/fit logic remain intact. A small explicit alternate-link map changes reader destinations without altering the original records.

## Non-citations removed, not invented

The 13 `openalex.org/source-types/*` and `openalex.org/types/*` URLs came only from `groups[].key` fields in the publication baseline fixture. They are analytical identifiers, not cited source documents. Two were confirmed unusable. All 13 are excluded consistently rather than keeping the same category error for the other 11. Fixture bytes, group keys and counts remain unchanged; actual API request/documentation references remain cataloged.

Historical audit records keep their original URLs. The directory remaps only the three reviewed financial originals in the named November 16 date-review file and the two DOI originals in the frozen tracker inputs used by the actual runtime alternate resolver. The map configuration itself is not a citation. An original appearing in any unrelated active source remains inventoried as that literal, so exact-directory coverage catches the mismatch. The regressions separately require canonical records and rendered data to use their new destinations. The source inventory narrowly admits the public schema citation rather than broadly admitting repository navigation.

## Scientific and financial limits

- No exhaustive scientific revalidation of the 587 source claims is claimed. A readable source page can still have comparability or evidentiary limitations.
- Science's indexed $104m is unchanged. April 14 becomes a reported **filing date**, not a closing date. The unsupported NEA round attribution is removed; nonparticipation is not asserted. Investor summaries are regenerated, not hand-edited.
- Date bases and funding facts for the two syndicated replacements are otherwise retained; a working article alone does not settle every historical date field.
- The TEMCA2 note no longer asserts current v13/v14 alignment recommendations on the strength of the replacement README.
- No HTTP downgrade, certificate exception, challenge bypass or inferred replacement slug was used.

## Regression coverage

`tests/link-repairs.test.mjs` checks canonical Science source/date/investor evidence and generated data; exact company/release/curation/schema replacements; same-DOI abstract links with untouched tracker records; non-citation exclusion and the fixture hash. Existing exact source-directory coverage tests reconcile additions and removals. Optional institution-link labels are covered by builder and mounted Funding tests. Historical golden restoration allows only the explicitly reviewed later fields, preserving unrelated change detection.
