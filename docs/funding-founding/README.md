# BCI Funding Index — founding years

Reviewed **2026-10-15**. The unchanged 25-company roster has **25 source-linked years**: 17 primary company, institution, investor or company-issued sources and 8 reporting sources. This is reviewed public-source coverage, not a claim that every legal incorporation date is known.

## Meaning and limitations

Use explicitly stated business/organizational founding. Keep legal registration, public launch, predecessor research and rebranding separate. No year is derived from a financing event. Unknown values are `null` and render as **Unknown**, never zero.

- **Neurosoft: 2020 selected; 2019 conflict unresolved.** Startupticker’s press-release account explicitly says co-founded in 2020; Venturelab lists incorporation on 7 August 2020. PitchBook instead says founded in 2019. These records do not prove that 2019 was a research/project origin, and no such explanation is assumed.[44][40][47]
- **Echo: 2023 and Merge: 2025 are reported years**, from fetched PitchBook company profiles, not primary incorporation records. Echo’s BCI product, financing and investor identity match the existing indexed business. The roster’s existing website/HQ fields are outside this update’s scope.[45][46]
- **Merge’s public introduction is 15 January 2026**; its Forest Neurotech lineage does not make Merge a 2023 company.[49][50]
- **Gestala: 2025 is formal corporate establishment**, stated in the company’s history as 5 September 2025. Its separate public establishment/launch announcement is dated 1 January 2026.[35]
- **Forest: 2023 is organizational establishment** of a nonprofit focused research organization.[26]

Some sources (notably PitchBook and LinkedIn) can impose access or bot restrictions. Evidence was read from nonempty fetched text; a later failed fetch does not turn a search snippet into proof. Source review dates describe this founding-year review only, not the older financing/regulatory review.

## Company-by-company source notes

| Company | Founding year | Source class | Interpretation |
|---|---:|---|---|
| Blackrock Neurotech | 2008 | primary | Company history dates the business to 2008 as Blackrock Microsystems; not the later Neurotech rebrand.[1] |
| Synchron | 2012 | reporting | CNBC explicitly dates the company founding to 2012; this is business origin, not later US corporate milestones.[20] |
| Neuralink | 2016 | reporting | Reuters explicitly reports a 2016 founding; not the 2017 public announcement.[2] |
| Science Corporation | 2021 | primary | CEO Max Hodak states that he and Alan Mardinly co-founded Science in 2021.[3] |
| Precision Neuroscience | 2021 | reporting | CNBC reports that Precision was founded in 2021.[21] |
| Paradromics | 2015 | primary | Company-owned profile explicitly lists Founded 2015; not the date of its first indexed financing.[22] |
| INBRAIN Neuroelectronics | 2019 | primary | Founding institution ICREA states established in 2019 and born in December 2019.[6] |
| Neurosoft Bioelectronics | 2020 | reporting | Startupticker's press-release account explicitly states co-founded in 2020, consistent with Venturelab's 7 August 2020 incorporation record. PitchBook instead reports 2019; this discrepancy remains unresolved. The index uses the corroborated 2020 organizational founding, without inventing a 2019 research-origin date.[44] |
| Axoft | 2021 | primary | Harvard identifies Axoft as founded in 2021 by Paul Le Floch, Jia Liu and Tianyang Ye.[7] |
| CorTec | 2010 | primary | Company About page explicitly states founded in 2010 in Germany.[8] |
| NeuroBionics | 2023 | primary | Company About page dates founding by MJ Antonini, Nicki Driscoll and Polina Anikeeva to 2023.[9] |
| Nia Therapeutics | 2018 | primary | Company timeline places founding and Penn patent licensing in 2018; preceding memory research is not company founding.[10] |
| Echo Neurotech | 2023 | reporting | PitchBook explicitly reports Echo Neurotechnologies founded in 2023. The BCI business matches the index's Bloomberg financing source; no primary founding statement was obtained. California registration in December 2023 is not proof of original Delaware incorporation.[45] |
| Coherence Neuro | 2022 | reporting | Founder-interview reporting dates Coherence to 2022 in Cambridge; not the later financing announcement.[11] |
| Merge Labs | 2025 | reporting | PitchBook explicitly reports founding in 2025. Merge's official public introduction was 15 January 2026; the earlier 2023 founding of predecessor Forest Neurotech is not Merge's founding. No primary 2025 founding statement was obtained.[46] |
| Newronika | 2009 | primary | Company CEO appointment announcement dates founding to 2009; used for business origin rather than the 2016 date found in commercial directories.[23] |
| Neuracle Technology | 2011 | primary | Investor HSG dates Neuracle to 2011, matching the Changzhou business in this roster; not a later Shanghai entity or unrelated namesake.[13] |
| NeuroXess | 2021 | primary | Official English homepage explicitly states founded in 2021.[14] |
| NeuCyber NeuroTech | 2023 | primary | Founding institution CIBR states NeuCyber NeuroTech (Beijing) was established in March 2023; not CIBR establishment in 2018.[15] |
| StairMed | 2021 | primary | Company introduction explicitly states established in August 2021.[16] |
| Gestala | 2025 | primary | Official history records formal registration and establishment on 5 September 2025. This is the corporate establishment year; the separate public establishment announcement and launch were on 1 January 2026.[35] |
| Forest Neurotech | 2023 | primary | Parent organization Convergent Research lists Established 2023; Forest is a nonprofit focused research organization, not a conventional venture-backed company.[26] |
| SubSense | 2022 | reporting | Founder-interview reporting explicitly dates the Palo Alto business to 2022; not its 2025 public emergence.[24] |
| Motif Neurotech | 2022 | primary | Joint MintNeuro/Motif partnership announcement explicitly states Motif was founded in 2022.[43] |
| Enspire DBS | 2010 | primary | Company-issued press release explicitly states established in 2010; preferred to the 2012 date in some company profiles.[19] |

## Data and UI contract

- `data/funding-index/foundings.csv` is canonical: one row per unchanged `companies.csv` slug. Fields are `company_slug`, `founding_year`, `source_url`, `source_kind`, `reviewed_on`, `note`. A blank year represents an explicit research gap.
- `scripts/lib/funding-index.mjs` validates roster equality/uniqueness, four-digit years no later than their review year, calendar-valid review dates, HTTPS evidence and source kind. `scripts/generate-derived.mjs` already delegates to that loader/builder, so no second generation path was added.
- `src/data/funding-index.json` carries `company.founding`; `FundingFounding` is the client contract. Generate with `npm run data:generate`, never edit derived JSON directly.
- The Companies timeline and stage cards show the year beneath each company name. Opening the existing company button exposes the source link, source class, review date and interpretive note. No additional wide column or nested interactive link was added. Existing capital ranking remains unchanged.
- Regression tests: `tests/funding-founding.test.mjs`, `tests/funding-founding-ui.test.mjs`, and independently pinned `tests/fixtures/funding-founding-years.json`. They cover all 25 values/links in both views, null rendering, invalid provenance, roster duplicates/gaps and deterministic regeneration.

Raw source reproductions and the exact-quote citation ledger are deliberately not committed.

## Sources

[1] https://blackrockneurotech.com/our-story/
[2] https://www.reuters.com/technology/neuralink-other-brain-chip-makers-face-long-road-fda-approval-2023-03-02/
[3] https://science.xyz/news/leadership-team-2025/
[6] https://www.icrea.cat/impact/innovation/spin-offs-companies/35/inbrain-neuroelectronics-sl/
[7] https://seas.harvard.edu/news/2024/01/long-lasting-neural-probe
[8] https://cortec-neuro.com/about
[9] https://neurobionics.io/about/
[10] https://niatherapeutics.com/about-us
[11] https://www.neurofounders.co/articles/how-coherence-neuro-is-developing-a-bci-to-fight-brain-tumors
[13] https://www.hsgcap.com/companies/neuracle/
[14] https://en.neuroxess.com/
[15] https://en.cibr.ac.cn/detail/cibrNewsnews/b8dbf43633cc4311a9798874fb0d435e
[16] https://stairmed.com/en/jietijianjie.html
[19] https://prnewswire.com/news-releases/enspire-dbs-therapy-announces-the-first-patient-implanted-in-the-second-center-for-restore-a-multicenter-pivotal-phase-23-clinical-trial-for-the-treatment-of-arm-weakness-and-reduced-function-after-stroke-302391666.html
[20] https://www.cnbc.com/2024/02/01/neuralink-competitor-synchron-buys-equity-stake-in-manufacturer.html
[21] https://www.cnbc.com/2023/01/25/capoot-precision-neuroscience-12523.html
[22] https://www.linkedin.com/company/paradromics-inc
[23] https://www.medicalalley.org/lothar-krinke-named-ceo-at-newronika-s-p-a/
[24] https://www.neurofounders.co/articles/how-subsense-is-reimagining-bcis-with-a-nasal-spray-instead-of-brain-surgery
[26] https://www.convergentresearch.org/ecosystem/forest
[35] https://www.gestala.com/news/7
[40] https://www.venturelab.swiss/neurosoft-bioelectronics
[43] https://www.prnewswire.com/news-releases/mintneuro-and-motif-neurotech-partner-to-advance-miniature-brain-computer-interface-therapy-for-mental-health-302758663.html
[44] https://www.startupticker.ch/en/news/neurosoft-bioelectronics-secures-funds-to-validate-its-brain-implant
[45] https://pitchbook.com/profiles/company/588916-09
[46] https://pitchbook.com/profiles/company/919687-78
[47] https://pitchbook.com/profiles/company/434967-67
[49] https://merge.io
[50] https://www.essentialtechnology.blog/p/announcing-merge-labs
