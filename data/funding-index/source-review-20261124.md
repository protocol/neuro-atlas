# China financing backfill — November 24, 2026

This is a finite, source-backed backfill of the existing implanted, minimally invasive, and implant-adjacent screen, not a market census or a change to eligibility. Baseline: `023598e99d14b799b536df680e07f9d30e83b649`. Six companies and eleven financing records are added, taking the roster from 25 to 31 and financing records from 42 to 53. No merge, deployment, background discovery or automatic roster expansion is part of this change.

## Accepted financing records

| Company slug | Documented date | Native financing | Form | Evidence |
|---|---|---|---|---|
| `neuracle-technology` | 2022-09-24 (event) | RMB 150m (≈$21.0m) | Financing (stage undisclosed) | [Primary-origin source](https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_0YC5.pdf#page=45) |
| `neuracle-technology` | 2024-11-08 (event) | RMB 250m (≈$34.8m) | Financing (stage undisclosed) | [Primary-origin source](https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_0YC5.pdf#page=48) |
| `neuracle-technology` | 2025-10-28 (event) | RMB 300m (≈$42.3m) | Financing (stage undisclosed) | [Primary-origin source](https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_0YC5.pdf#page=52) |
| `gestala` | 2026-07-03 (reported) | RMB 420m (≈$61.9m) | Angel+ | [Primary-origin source](https://gestala.com/news/22) |
| `zhiran-medical` | 2026-02-11 (announcement) | RMB 300m (≈$43.4m) | Series A+ | [Primary-origin source](https://bciflex.com/News) |
| `nanochap` | 2026-11-03 (announcement) | RMB 500m (≈$75.0m) | Series C+ | [Primary-origin source](https://www.nanochap.com/news_info/id-105.html) |
| `conmind` | 2026-04-08 (reported) | Nearly RMB 200m (≈$29.3m) | Series C | [Primary-origin source](https://nmed.org.cn/Content/xwzx/xw/2026-04/147323.html) |
| `xinsheng-shijie` | 2026-06-18 (reported) | Nearly RMB 100m (≈$14.8m) | Seed | [Primary-origin source](https://finance.sina.com.cn/wm/2026-06-18/doc-inicvfcv5537233.shtml) |
| `active-technology` | 2026-08-03 (announcement) | RMB 330m (≈$48.8m) | Angel | [Primary-origin source](https://www.zidonghua.com.cn/news/Finance/270129.html) |
| `active-technology` | 2026-11-04 (reported) | RMB 464m (≈$69.5m) | Angel+ | [Primary-origin source](https://zidonghua.com.cn/news/Finance/394874.html) |
| `bci-sonics` | 2026-10-23 (reported) | RMB 200m (≈$30.0m) | Pre-A | [Primary-origin source](https://www.bcisonics.com/article/5786479998588415) |

## Accounting and source interpretation

- **Neuracle:** the issuer statutory prospectus documents three separate new-money subscription agreements: RMB150m (September 24, 2022), RMB250m (November 8, 2024), and RMB300m (October 28, 2025). Agreement dates are labeled actual documented events, **not cash-receipt or announcement dates**. The RMB250m agreement had two RMB125m closings in December 2024 and May 2025; it is counted once, without also adding the closings. Annual chart placement follows agreement timing, not annual cash flow. PDF fragments point to the actual agreement pages (45/48/52). The old RMB60m WI Harper report remains a separately sourced historical record; its publication date is not proof of investment timing. We have not asserted a complete historical financing chronology or resolved its underlying transaction date.

- **Gestala:** July RMB420m Angel+ is separate from March RMB150m. RMB570m is their cumulative total, never an additional round. The issuer bilingual July 3 announcement and later August issuer release support RMB420m; a neighboring July 8 media-listing headline says RMB430m. This is a source conflict, not a second financing. July 3 is a publication date, not a closing date.

- **Approximate disclosures:** Conmind discloses nearly RMB200m and Xinsheng Shijie nearly RMB100m. Their native values and historical-USD comparisons remain approximate; sums incorporating them are not exact audited capital. No vague 数千万元/数亿元 values were converted into invented points. Conmind is an interventional-BCI platform alongside vascular devices; its existing vascular sales/approvals are not BCI commercialization.

- **Primary origin versus hosting:** the Active Technology releases identify the issuer as their source; the Xinsheng Shijie release identifies the participating investor. These are explicitly labeled syndicated issuer/investor content, not independent reporting or native company websites. Active Technology’s and Xinsheng Shijie’s company links are labeled announcement links because no official domain was established. Generic unnamed investor groups are not turned into fictitious investor entities.

- **Metadata:** unverified current headquarters and founding years remain explicitly unknown; an office, founding location, academic laboratory or prior core-team milestone is not corporate incorporation. Neuracle headquarters and epidural approved-device description, Gestala location, and the existing NMPA marker are corrected from direct issuer/regulator material. Nanochap’s retinal clinical work and cortical R&D remain distinct.

- **FX:** new comparisons use pinned Federal Reserve H.10 observations from the event/publication date. For September 24, 2022 (Saturday) and July 3, 2026 (US holiday), use the previous published business-day observation, explicitly labeled. Neuracle uses documented agreement-date FX, never an invented investment date. Conversion provenance is stored in `fx-conversions.json`; no live FX revaluation.

## Explicitly held out

Mindtrix’s RMB150m is cumulative across several angel rounds; the direct-investor accessible page does not establish their allocation/timing. Ruiyi Xulian’s RMB16m is one investor’s subscription, not the whole financing. Neither is plotted as a new full round. Other holds include vague amounts, combined series without allocations, inaccessible direct bodies, or incomplete implant-specific evidence. BrainCo and other surface-EEG/EMG/robotics businesses are not added solely because a broader industry report calls them BCI. This is not a judgment that they lack commercial traction.

## Known coverage failure and bounded prevention

Repository history shows a manually seeded roster that stayed at 25 companies while selective history enrichment and the newsletter-driven update lane operated within it. Gestala’s July financing was already discoverable before the seed and fits an already included modality; its omission cannot be excused as a scope exclusion. Zhiran existed as a lead in the earlier broader ecosystem source but was absent from the funding seed. No original exclusion rationale was found. The exact original screening/search log is unavailable; an English-only search ban, a country filter or a solely language-caused omission is not established.

The backfill adds exact known-event regressions and canonical/generated/timeline parity checks; historical goldens are reconstructed through a strict explicit reviewed delta rather than globally reset. These tests protect this finite accepted set, **not completeness of the Chinese market**. Existing newsletter producer scope and schedules remain unchanged.

## Verification

Acceptance requires source/native-amount/date/FX preservation, one appearance per accepted financing in canonical and generated funding data and in Milestones, explicit unknown metadata and approximate amounts, dynamic roster copy, and desktop/mobile rendered review. Test/build/native receipts and screenshots are recorded in the PR; pre-existing baseline failures are reported separately rather than relabeled passes.
