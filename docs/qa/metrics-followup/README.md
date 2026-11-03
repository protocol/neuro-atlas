# Atlas Metrics follow-up — November 3, 2026

## Requested behavior

- Menu: Milestones → Field Velocity → BCI Funding Index → Ecosystem.
- Field Velocity tab: Expectations → Inflection points, retaining `#expectations`.
- Engagement: Idea vintage → Citation latency, retaining `#idea_vintage`.
- Replace the final historical participant-count scalar with a populated chronological chart at `#revealed_commitments`; add recent papers.
- Audit Blackrock, Science and Precision for translation evidence and provide direct chart sources.
- Cost and automation: human/mouse cortex second; the former second tile (PATHFINDER proofreading throughput) last.
- Preserve PR #74's always-full horizontal rails and all other ordering.

## Participant evidence

The participant chart preserves all nine inherited snapshot observations and adds six reviewed checkpoints: ONWARD 3, 5 and a later reaffirmation of 7; NEO lower bounds ≥1, ≥2 and ≥32. It displays **15 dated checkpoints across six separate cohorts**. These are overlapping source cohorts, not an additive global installed base. Review observations, program disclosures and surgery dates retain their own date basis.

NEO's 32 confirmatory recipients were reported as implanted **during 2025** in the April 2026 Digital China/Guangming Daily report. The year anchor is not an invented January surgery date. The three recent literature links retain their different eligibility criteria; 67, 214 and 39 are not joined into a false cumulative series.

Reviewed additions and supporting quotations are in `src/data/field-velocity/bci-participants.additions.json`. The provider snapshot and provenance file are unchanged.

## Latency correction and interpretation

The upstream endpoint audit dated October 28 withdrew plot approval for the old four first-animal-event → first-human observations. The former values and pooled median are no longer rendered.

The replacement is explicitly **selected public preclinical reports/demos → documented human milestones**, not first experimental work → first human use. The opening modal states this before the plot and says that fieldwide acceleration remains unmeasured. Five dated source pairs are shown; every pair links both endpoints directly. Calendar precision determines the elapsed-time whiskers, not statistical uncertainty.

- Blackrock is included in the historical Utah/BrainGate lineage, not as a separate modern transition.
- Precision's Layer 7 temporary intraoperative placement is a separate clinical-endpoint track, not a chronic implant.
- Science Biohybrid's human endpoint is unverified in the reviewed evidence and is not plotted. Its PRIMA retinal lineage is documented separately rather than misattributed to Biohybrid.
- Paradromics' temporary and long-term milestones are retained as separate evidence, not combined into an unsupported comparable interval.

This sample **does not establish that newer companies are translating faster**, support company rankings, or measure fieldwide acceleration. Sources, endpoint bases and limitations are in `src/data/field-velocity/bci-translation-evidence.json` and the modal source table.

## Verification

- Production build, route type generation / TypeScript, changed-source ESLint, and `git diff --check` passed.
- Full Node regression suite passed after updating obsolete scalar/title/withdrawn-latency expectations. New tests cover participant source preservation, lower bounds, linked papers, retained modal/history identity, exact Cost ordering, preview source links, before-plot latency scope, date-range arithmetic and invalid endpoints.
- Native headed Chrome replay at **1440, 390 and 320 px**: requested navigation/tab labels; 21 actual chart tiles; equal card heights; no document horizontal overflow; 15 participant source rows/marks and three papers; legacy Citation latency URL with 27 original observations; modal close/focus and Back/Forward; five latency marks, ten endpoint-source links, Science unplotted; Cost ordering, keyboard opening, search by Citation latency / Blackrock / NEO.
- The local production QA copies use a private loopback-only proxy fixture with a revision marker and Host rejection. That fixture is **not committed**. Local screenshots prove UI behavior, **not hosted authentication**. Production auth/noindex source is unchanged.
- Independent critic found one material issue: the replacement metric's defining scope appeared below the expanded plot. It was moved above the plot, regression-tested and recaptured. Final review is scoped to that finding and newly introduced critical defects.

## Screenshots and receipts

All screenshots are actual local production-rendered Atlas pages, not mockups.

- `before-navigation-1440.png` / `after-navigation-1440.png`: primary menu and tabs.
- `before-participants-1440.png` / `after-participants-1440.png`: scalar → participant time plot.
- `after-participants-modal-390.png`: mobile participant chart and cohort context.
- `after-latency-1440.png` / `after-latency-390.png`: defining scope before the plot.
- `after-latency-sources-390.png`: direct source evidence on mobile.
- `before-cost-1440.png` / `after-cost-1440.png`: human/mouse cortex moved second.
- `native-results.json`: width-specific objective replay results.

Only an open review PR is authorized. No merge or production release is performed by this change.
