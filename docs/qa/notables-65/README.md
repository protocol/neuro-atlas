# Notables #65 rendered evidence

Actual headed Chrome screenshots from isolated local production builds; **not live production or hosted-authentication screenshots**.

- Baseline source: `592c039b6bf21198e177bafe0f81e267b4415ff7`.
- Candidate data/runtime source: `be096e1c9fa6b3e338a2089ea9ce5a769ff48a29`.
- Loopback origins: before `http://127.0.0.1:35791/neuro-atlas`; after `http://127.0.0.1:35792/neuro-atlas`.
- Both copies replace only their disposable local proxy with a raw-Host-guarded, explicit-QA-flag fixture and bind to 127.0.0.1. The actual PR and production access gate, noindex and base-path sources are unchanged. Wrong-host requests return 401.
- Source/data/public file hashes were compared. Candidate copy is identical to the candidate source except its loopback fixture. Each copy's only tracked local change is `src/proxy.ts`. No fixture is included in this PR.

## Captures and scope

`before-timeline-1440.png` / `after-timeline-1440.png`: same October-visible Milestone timeline state. It is a horizontally scrolled actual timeline, not a recreated chart. The six new source links were asserted absent on baseline and exactly once on candidate at 1440 and 390px.

`before-funding-detail-1440.png` / `after-funding-detail-1440.png`: native Coherence company detail opened through the Funding index. Candidate visibly shows the Oct. 21 $45m Series A, direct source and Nov. 9 row-level review; indexed capital changes from $10m to $55m because the older indexed seed remains. This is not a new verification of every historical financing.

`after-detail-neuroxess-Series-B.png`: genuine hovered October 28 capital marker; RMB700m is preserved and the lack of any USD amount/conversion is explicit. This event does not contribute to USD totals or a new Funding index round.

`after-funding-detail-390.png`: actual narrow company-detail state. New round is visible; the rest of the financing card is below the viewport and remains scrollable.

All six candidate timeline markers were natively hovered and their exact canonical note text read back. Additional private captures and machine-readable browser results remain outside the repository. Existing timeline Leadership and older data are unchanged; separate open PR #55 owns the Science appointment removal.

## Checks

- Frozen `npm ci`: passed.
- Data generation: passed and deterministic across 49 generated/logo files.
- Full `npm test`: 1,109 passed, zero failures, cancellations or skips.
- Typecheck and unmodified-auth production build: passed; build repeated with the actual `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`.
- Isolated before/after production fixture builds: passed; real routes, six source links, native tooltips and Coherence detail at 1440/390 passed.
- Existing Notables #64 frozen-delta test originally rejected any future rows (90 versus 84). It now explicitly excludes the six separately frozen #65 source URLs while retaining both original baseline hashes. New #65 tests freeze all 84 prior records, all historical funding rounds, regulatory markers and the sole indication correction.

No application UI/code, auth, methodology, dependencies, field-velocity data or global coverage date is changed. No merge or production promotion.
