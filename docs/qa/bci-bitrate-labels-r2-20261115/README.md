# BCI estimate labels and visible R² — November 15 follow-up

## Acceptance and boundaries

Requested changes: use **PL R&D estimate** instead of Atlas-estimate, explain “unlabeled cursor report,” and disclose **R²** plus enough data/method to reconstruct or question the findings. No author outreach was sent.

Runtime: **37ae02ff11cefeec3e07df3056f0c8660e5b3729**. Documentation/data reconstruction reference: **3d423dadab8aab1a9259361db63693127af4624e**, with byte-identical current CSV, methods, Python replay and fitting function. Subsequent evidence-only commits do not change runtime/tests. No merge, production release, auth/configuration/package change, new data selection or estimator change.

## Verified output

- Five speech rows, source inspections, data/CSV and native image key say **PL R&D estimate**. Handwriting remains **Author estimate**; reported/company/image bases remain separate.
- Four unnamed reference dots say **Cursor control A–D · source unconfirmed**. Candidate links stay unconfirmed and outside `sourceUrl`; the original historical image ledger and prior QA are unchanged.
- On-site line key and actual native Download/clipboard PNG show **R²(log10) = 0.455**. Detailed note gives **0.455330**, identifies equal-weight unconstrained OLS in log space and the 14 mixed-evidence inputs. Equation and assumptions remain disclosed.
- **Data and fit code** next to the line key opens the immutable public methods page. Its exact URL was verified HTTP **200**, with four referenced remote files byte-matched after publishing. The independent reviewer’s prepublication 404 finding is closed in `methodology-link-closure.json`.
- `docs/bci-study-data/reproduce_fit.py` uses only Python’s standard library and the full-precision CSV. It outputs every input, SHA-256, coefficients, log-space R² and SSE/SST; accepts an edited CSV for sensitivity checks. Tests compare every CSV input and coefficient against the actual chart model within 1e-12. This reconstructs our current chart, not the unrecovered original numeric dataset.

Actual replay: intercept **−0.9294723618914491**, slope **0.06027654128356745** per year from origin **2000**, R²(log10) **0.45533018672824777**, SSE **2.3310821566960036**, SST **4.279807876066295**, **n = 14**. This is a descriptive fit of heterogeneous measurements/proxies, not a validated common-task benchmark, causal scaling law or forecast.

## Checks and review

- **89/89 focused tests** covering BCI model/integration/provenance/mobile/fit/readers, shared draft-chart behavior and preview integrity; typecheck, scoped ESLint and both real-source/isolated-fixture production builds passed.
- RED→GREEN recorded for new owner labels, anonymous labels, visible R², independent reconstruction, and rendered methodology link.
- Independent read-only review at the exact runtime: code/math otherwise PASS; one located prepublication issue was the unpublished pinned methods URL. Publication plus exact public HTTP/remote-byte readback closed it. Independent 50-digit decimal calculation agreed with the full-precision fit. No scientific selections changed.
- Deterministic reconciliation confirms identical 14 IDs/years/values/qualifiers/source URLs/candidate assignments and identical fitted endpoints versus prior accepted provenance runtime; `invariants.json` records the comparison.
- Actual headed Chrome on loopback at **1440/390/320px**: exact chart identity, 14 marks/rows/keys, latest labels, visible R², methodology link, source/candidate/estimate inspections, keyboard Escape/focus/history, Copy link clipboard readback, Copy chart and native Download PNG passed.
- Final native Download and clipboard PNG are **2400×2348**; rendered PNG and mobile/inspection images were visually inspected. `fit-disclosure-320.png` captures the lower mobile line key/link rather than claiming an offscreen element appeared in the top-of-chart screenshot.
- **16 served static assets** matched the pinned fixture build byte-for-byte. Runtime header was exact. Local-only proxy remained uncommitted in the disposable fixture, guarded by opt-in/loopback Host/noindex. It was not pushed.
- One initial native run failed from a newly added QA JavaScript selector’s quote escaping, not an application assertion; corrected the test selector and reran all three widths successfully. Prior failure output remains in scratch; this directory contains the passing replay.
- Task-owned browser targets closed, preexisting targets preserved, browser hold released and task server/port closed.

The broad full suite was not rerun for this bounded copy/disclosure change. Prior provenance aggregate remains **1,282/1,283**, with one unchanged analytics timing failure and isolated baseline/candidate passes; do not present it as all-green.

Screenshots are **real local loopback-fixture output**, not hosted authenticated acceptance. Local-origin footer URLs are expected. Existing hosted prelaunch access/noindex gates remain unchanged. Hosted deployment status is verified separately from these native interactions.

## Files

- `bci-bitrate-native-export.png`, `bci-bitrate-native-clipboard.png`: actual native outputs.
- `chart-desktop.png`, `chart-390.png`, `chart-320.png`: opened chart at each width.
- `fit-disclosure-320.png`, `plrd-estimate.png`, `candidate-2018.png`: focused native disclosures.
- `native-qa.json`, `clipboard.json`, `served-assets.json`, `fit-disclosure-320.json`, `invariants.json`, `fit-reproduction.json`, `methodology-link-closure.json`, `tab-cleanup.json`: objective evidence.
- `artifacts.json`: captured-file SHA-256 ledger.
