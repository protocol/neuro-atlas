# Paradromics — selective public financing correction

Reviewed November 24, 2026. This is a correction to Paradromics in the Neuro Atlas Funding index, not a whole-index funding refresh or a complete capital-history audit. The index-wide coverage checkpoint remains November 17; the three affected records have their own November 24 source-review dates.

## Source-bound changes

| Financing record | Public evidence and date basis | Treatment |
| --- | --- | --- |
| 2021 Seed offering | [SEC Form D/A, filed October 19, 2021](https://www.sec.gov/Archives/edgar/data/1668302/000166830221000003/xslFormDX01/primary_doc.xml), Item 13: **$28,230,600 sold**. First sale January 15, 2021. SEC offering file `021-388012`. | Replace the existing $20m announcement amount with $28.2306m for the same offering; do not add an amended total to an earlier total. Plot the later disclosure as **Reported October 19, 2021**, not at the original announcement or first-sale date. |
| 2022 equity/debt financing | [SEC Form D, filed September 21, 2022](https://www.sec.gov/Archives/edgar/data/1668302/000166830222000002/xslFormDX01/primary_doc.xml), Items 7, 9 and 13: first sale February 17, 2022; equity **and** debt; **$8,864,853 sold**. Offering file `021-459454`. | Show a fourth financing record, dated **Reported September 21, 2022**, retaining $8.864853m and no invented named investors or Series label. **Excluded from indexed total — conversion overlap unresolved.** Do not assume it is unique new cash in addition to later offerings. |
| 2023 Series A offering | [SEC Form D/A, filed November 7, 2023](https://www.sec.gov/Archives/edgar/data/1668302/000193459823000003/xslFormDX01/primary_doc.xml), Item 13: **$50,141,276 sold**, not the $51,012,815 offering target. First sale March 21, 2023. Offering file `021-478025`. | Replace the existing $33m announcement amount with $50.141276m for the same offering. Plot **Reported November 7, 2023**, not the original announcement or first-sale date. |

Filing dates and shared offering-file identities were checked against the issuer's [SEC submissions metadata](https://data.sec.gov/submissions/CIK0001668302.json). A filing date is not a closing date; first sale is not proof that the full later-reported amount was sold that day. Form D reports are issuer disclosures, not SEC certification or audited cash receipts.

## Preserve the original evidence

- The [July 22, 2021 issuer announcement](https://paradromics.com/news/paradromics-raises-20mm-in-seed-funding-led-by-prime-movers-lab-to-advance-brain-computer-interfaces/) disclosed a **$20m Seed**, led by Prime Movers Lab, with Westcott Investment Group, Dolby Family Ventures, Synergy Ventures, Pureland Global Venture, IT-Farm and Alpha Edison. Its separate $10m earlier private-funding and $15m public-funding statements are cumulative context, not additional indexed rounds.
- The [May 18, 2023 issuer announcement](https://paradromics.com/news/paradromics-raises-33-million-in-funding-achieves-breakthrough-medical-device-designation-from-fda/) disclosed a **$33m Series A**, led by Prime Movers Lab, with Westcott Investment Group, Dolby Family Ventures and Green Sands Equity.
- Original announcement dates, amounts and original syndicated source URLs remain in the corrected records' notes. The original 2021 note is retained. Participant citations preserve literal issuer excerpts on the exact corrected offering records. The named investors are associated with the **whole offering** based on those original announcements; neither these citations nor the amendments establish each investor's participation in later sales, check size, or share of incremental dollars.
- The existing 2018 $7m record and every unrelated company, financing, investor identity, portfolio relationship, founding record and regulatory marker remain unchanged.

## Totals and exclusion semantics

Paradromics now has **four sourced financing records**, of which **one is held out of capital totals**. Included capital is $7m + $28.2306m + $50.141276m = **$85.371876m**, rounded once to **$85.37m** in company aggregation and **$85.4M** in the dashboard. This is indexed financing, **not lifetime funding**. The 2022 $8.864853m remains a real disclosed amount, not a fabricated zero-dollar financing.

The canonical optional `capital_treatment=overlap-unresolved` becomes `capitalTreatment` in generated data. The shared counted-capital helper excludes that record from generator/global capital, company capital, investor-associated capital and portfolio/member-associated capital. Record/appearance counts remain record counts. Unknown treatments and holds without an explanatory note are rejected rather than silently included. The timeline uses a hollow dashed marker and visible exclusion text; the company summary, stage view, financing card and source context retain the qualification.

Across the unchanged 25-company roster, the generated index now contains **43 sourced financing records** and **$3,579.33m indexed capital**; the added 2022 record contributes no dollars to that sum. Associated offering capital is not an attributed investment amount. No portfolio membership is promoted to round participation.

## Public company-reported total

The [State of MedTech interview with CEO Matt Angle, published November 18, 2026](https://www.youtube.com/watch?v=JMQoWtsMBh0&t=2587s), provides a public **$180M total-funding self-report**. At **43:07–43:14**, automatically generated captions read: “I think we've had about 18 million … 18 million dollars of 180 million dollars total funding came from the federal government.” The scope label is **Includes federal funding**. The report date records the interview publication date; it does not establish an exact financing closing date or a cash-balance date. Captions and public video metadata were reviewed; the audio was not independently checked.

`reported-totals.json` preserves this company self-report as separate canonical metadata, generated as top-level `reportedTotals`. Company detail prominently shows **$180M**, the federal-funding scope, publication/report date, and the timestamped source; **$85.4M indexed financing** is a distinct secondary metric. Timeline and stage company rows visibly annotate the reported total while their indexed financing column and stage bar remain unchanged. Full methodology notes are available in a collapsed Source notes disclosure and the exact interview's source-context block. The public source catalog registers that exact timestamped URL as a company disclosure.

This addition leaves all four financing records, named-investor provenance, **$85.37M company indexed capital**, **$3,579.33M global indexed capital**, record counts, investor-associated capital, and portfolio-associated capital unchanged. No financing amount is inferred by subtraction from the reported total. The historical normalization allowance checks the entire exact new metadata and catalog pair before removing only that addition for older frozen goldens.

## Cross-checks and remaining limits

The company's [April 10, 2022 blog](https://paradromics.com/blog/bci-news/) reports **$38m in venture funding and $18m in public funding from NIH and DARPA**. This already exceeds the previously indexed $27m across the 2018 and original 2021 announcements. It demonstrates incomplete announcement coverage; the difference is **not** evidence for a newly invented financing or permission to add cumulative figures to individual offerings.

The [October 14, 2021 NIH announcement](https://paradromics.com/news/paradromics-announces-nih-award-to-fund-translational-and-early-stage-clinical-research/) describes a **$3.2m Phase II SBIR award**, including an MGH subaward. Standalone grants remain outside Funding index totals; an award is not proof of cash received. The award may overlap the later cumulative public-funding disclosure, so those figures are not summed.

The February 2025 NEOM strategic investment is already represented in Milestones with its amount undisclosed. No amount, priced-round stage or operational Center of Excellence is inferred. Milestones still covers **2024–2026**: no invisible pre-2024 financing rows are added and its year range is not expanded for this correction.

**The itemized capital history remains partial.** The unresolved 2022 debt-conversion relationship, unquantified later financing, cumulative statements, and grants still need matched-scope reconciliation. The separate $180M public company self-report communicates the CEO's stated total and federal-funding scope with those limits intact. The indexed-capital methodology and company roster stay fixed. Routes, legacy links, auth, and indexing behavior are unchanged; exact interview context uses the existing stable `#source-context` anchor.
