# China financing additions — verification

## Revisions and scope

- Original source/accounting and code review: `204cfb81ff2ba00c6338fedaf405368669b4e388`.
- Plain-language revision: `703b72bc00d12aefb44aeb0347b4db4afee82300`.
- Original baseline: `023598e99d14b799b536df680e07f9d30e83b649`.
- Six new companies and eleven additional financing records. Each appears once in Funding Index and Milestones, giving 31 companies and 53 records under the existing selection criteria.
- [Financing records, sources, dates and research limits](../../data/funding-index/source-review-20261124.md).

## Language revision

The company details name who wrote each announcement and where it was published. For example: “Announcement by the investor 经纬创投, published on Sina on June 18, 2026.” Notes describe approximate amounts, agreement dates and unknown closing dates directly. Coverage explanations and exchange-rate labels use the same approach.

A comparison against the original PR head confirms that amounts, dates, investors, currencies, rates, source URLs, selection criteria and calculated totals retain their original values. Changes cover explanatory text and source-link labels. The historical test fixture retains the same nine files and original baseline hashes.

## Checks

| Check | Language revision result |
|---|---|
| Focused funding, source, historical-rate and language tests | 98/98 pass |
| Full `npm test` | 1,652 tests; 1,616 pass; the same 36 pre-existing failures; zero canceled or skipped |
| Failure comparison | The existing failure IDs and error/assertion diagnostics match the original baseline |
| Production build, typecheck and changed-code lint | Pass |
| Independent language and meaning review | Pass after four specific wording corrections |
| Financial/source comparison | Amounts, dates, investors, currencies, rates, links and calculated totals match the original PR |
| Desktop/mobile browser checks | Pass in both themes; refreshed screenshots show the reviewed text |

Detailed results: [`qa/language-test-comparison.json`](qa/language-test-comparison.json), [`qa/language-review.json`](qa/language-review.json), and [`qa/language-fidelity.json`](qa/language-fidelity.json).

### Original review

| Check | Recorded result |
|---|---|
| Original baseline `npm test` | 1,633 tests; 1,597 pass; 36 fail; zero canceled or skipped |
| Original PR `npm test` | 1,651 tests; 1,615 pass; the same 36 fail; identical error/assertion diagnostics after removing timing and stack frames |
| Independent source/accounting review | PASS for all eleven financing additions and six companies, including the Chinese company/investor/regulator sources, Federal Reserve releases and exact prospectus pages |
| Independent code/report review | The source-directory finding CN-CODE-001 was corrected and independently closed at `204cfb8` |
| Source directory | One pre-existing PMC URL omission remains visible in the original test. Additional entries: zero. |
| Historical test reconstruction | All nine reviewed files reconstruct the original baseline bytes and expected hashes |

The original full-suite comparison is retained in [`qa/test-comparison.json`](qa/test-comparison.json). Results of the language revision are recorded alongside it.

## Browser checks and screenshots

The screenshots show the actual production-built application served locally, using Chrome pointer/keyboard input at 1440×1000 and 390×844 in both themes. These checks cover all six new company details, Neuracle and Gestala, displayed amounts and source links, company counts, and page/detail-panel widths. Physical-phone testing and a signed-in hosted interaction check remain separate verification tasks.

The mobile financing note retains its full source text and original WeChat link. A wrapping rule keeps the long URL within the card; `qa/language-mobile-metrics.json` records the measured widths. The funding timeline scrolls horizontally inside its own container.

- [Funding Index, desktop dark](qa/funding-dark-1440.png)
- [Funding Index, desktop light](qa/funding-light-1440.png)
- [Neuracle company details](qa/detail-neuracle-technology-light-1440.png)
- [Nanochap company details](qa/detail-nanochap-light-1440.png)
- [Xinsheng Shijie company details, mobile](qa/detail-xinsheng-shijie-light-390.png)
- [Xinsheng Shijie financing source, amount and date, mobile](qa/detail-xinsheng-financing-light-390.png)
- [Company stages, mobile light](qa/stage-light-390.png)
- [Company stages, mobile dark](qa/stage-dark-390.png)

## Remaining research

Company financing histories remain partial. Neuracle's earlier RMB 60m investor-page record still needs reconciliation to establish its underlying transaction date. Conmind and Xinsheng amounts retain “nearly.” Mindtrix's combined angel-round amount needs allocation by round and date; Ruiyi's investor contribution needs a verified full-round size. Company fields with unresolved sources stay marked unknown.

The PR remains open for review. Production and existing recurring workflows retain their current state.
