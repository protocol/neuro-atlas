# Neuro Atlas — Milestones, mobile navigation, and investor coverage

Runtime revision: `586750124dff528c8239a39e3b87162dd64129ab`.

## What changed

- Science's November 17, 2026 **$400 million Series D** appears once in both canonical financing datasets and their generated consumers. [Company announcement](https://science.xyz/news/series-d/). The greater-than-$900m cumulative figure is not added as another round.
- Milestones opens around the actual current date, with the summary panel expanded and lane names retained while scrolling. **Fit year removes horizontal scrolling** by repacking full-size marks into additional rows. It does not remove vertical page scrolling or fit the entire timeline on one screen.
- Mobile navigation uses a hamburger/native modal. The Funding controls collapse search and filters; the default mobile toolbar is 110px high. A compact opaque company-name column remains visible at the far-right scroll position and still opens the exact company detail.
- The Investors lens uses `/neuro-atlas/funding?view=investors`, with direct load, reload, Back/Forward, and unrelated repeated query/hash retention.
- Protocol Labs / PLC Neurotech coverage shows **10 selected published neurotech portfolio companies**, **6 in the existing BCI screen**, and **3 distinct indexed financing records** as separate evidence classes. Round source identities remain distinct; portfolio-only membership does not manufacture a financing date, amount, stage, or investor check. [Published portfolio](https://plcapital.xyz/neurotech); [platform disclosure](https://plcapital.xyz/disclaimer).
- Generic Investment / Financing / undisclosed-stage labels share one **Undisclosed** group. Named rounds and original per-record source wording remain unchanged. Narrow Stage cards no longer widen a 320px viewport.
- Newly discovered broken Echo and Merge company links use their verified current primary sites. The source review is in [`data/funding-index/source-review-20261117.md`](../../data/funding-index/source-review-20261117.md).

## Verification

- Clean-main baseline: **1,404 tests passed**.
- Final runtime: **1,426 tests passed; zero failures** via `node --import tsx --test --test-concurrency=6 tests/*.test.mjs`.
- Production webpack build, TypeScript route generation/typecheck, and changed-source ESLint passed.
- Historical source-audit and Notables hash constants remain frozen. Tests assert only the exact later Science addition and reviewed website replacements before reconstructing historical inputs in clones; no blanket rehash or weakened digest.
- Native headed-Chrome replay at **1440, 768, 390, and 320 CSS pixels** passed both surfaces: actual current date and lane context; every 2026 source identity/date position; full-year horizontal bounds and collision checks; native menu navigation/Escape/focus return; search and scope filters; horizontal wheel → pinned company → exact detail; one Undisclosed group; and Investors URL/history/reload/10–6–3 reconciliation. There are 56 dated 2026 marks in each Fit-year receipt.
- Native mobile Appearance toggle reached dark mode without overflow; measured muted text/card contrast was **6.98:1** at 390px. The task's loopback theme was restored afterward.
- Served bytes matched both production-built page files and **14 static assets**. The local viewer was loopback-bound, Host-restricted (other Host → 403), and noindex/no-store. See `runtime-parity.json`.
- Independent code review passed at `9354bc1`. Independent final feature/visual review at the runtime revision found no blocking defect; its remaining handoff gates were the terminal full-suite result and remote PR/preview readback, checked separately at handoff.

## Evidence boundary

These are **actual local captures of the production-built HTML/RSC/assets**, not screenshots of an authenticated hosted deployment. Native pointer input and viewport emulation are not physical-phone touch testing. Auth, launch, cache, hosting settings, and production were not changed by this PR. A human merge/release decision remains separate.

The native menu uses Chrome's native modal focus behavior. During Tab wrapping Chrome can expose a document-body boundary; the following Tab returns inside the still-modal dialog. The replay rejects focus on any nonmodal page control, and separately checks Escape/focus return and route-close behavior.

`milestones-native.json`, `funding-native.json`, `runtime-parity.json`, and `manifest.json` bind the measurements and captures to the runtime revision. The dated replay is `scripts/qa/ui-feedback-20261117.py`; provide its documented QA globals inside the owned browser-harness session.

## Captures

- `before-funding-390.png`: untouched-main mobile controls.
- `funding-compact-390.png`, `funding-pinned-390.png`, `mobile-menu-390.png`: compact controls, far-right identity, and hamburger menu.
- `milestones-current-1440.png`, `milestones-fit-1440.png`, `milestones-fit-390.png`: current-date default and no-horizontal-scroll Fit year.
- `investors-1440.png`, `investors-320.png`, `investors-dark-390.png`: separate evidence denominators and dark/mobile layout.
- `funding-stages-320.png`: bounded Stage cards.
