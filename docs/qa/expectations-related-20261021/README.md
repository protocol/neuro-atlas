# Expectations related measurements: local evidence

## Provenance

- Base/main: `6603d9b8fec4b3ac9438a1c2b7aba2ce505c3967`.
- Before screenshots: retained loopback build at `8fe8412c035a9d9c776dd5dd20c99aade82c7a7e`; independently verified no runtime/data/config delta from base/main.
- After screenshots and the corrected `native-results.json`: `739f99f6920dda8a67a30871905940a5875b9f77`.
- Both run the actual production Next app under `/neuro-atlas/field-velocity`, with only a disposable `proxy.ts` passthrough in a separate, loopback-only worktree. That fixture is never committed, pushed or deployed. Production auth/routing remains unchanged.
- Images are headed-Chrome local captures, not authenticated hosted acceptance. Responsive keyboard/pointer tests do not establish physical-phone touch behavior.

## Verified behavior

At the corrected runtime revision, `npm test`: **261 passing, zero failed**. Typecheck, changed-file ESLint and production build passed. Eleven served client assets matched the built worktree before and after replay.

`scripts/qa/expectations-related-browser.py` ran at desktop 1440 and mobile-emulated 390/320 widths:

- All five links at each width (15 cases), including native pointer/Enter activation, actual plotted observations, query/base-path preservation, category reveal, settled target scrolling, and Back/Forward heading/origin-link focus.
- Retained A → Expectations tab → B history, all three Back and Forward transitions at each width (3 cases).
- All five direct URLs in genuinely fresh documents reveal their plotted targets (5 cases).
- A prior no-match Metrics search is cleared when an Expectations related link reveals its target (1 case).
- Separate forecast disclosure open/close at every width; existing external questions open in a new tab.
- Equal document client/scroll widths at every tested width.

The corrected receipt records **24/24** cases, plus forecast and layout assertions. Final-head replay and independent-review status are reported in the PR, separate from these source-revision receipts.

## Review correction

Independent review found that the initial last-clicked ref lost focus intent for older visits in retained history. The parent reproduced the exact failure in both the component test and native browser before changing code. Focus is now associated with a validated anchor on each history entry, preserving existing router state. The independent reviewer subsequently passed all six related-measurement tests and closed the finding.

The QA probe waits for the existing second-frame scroll as well as heading focus. It avoids redundant same-URL navigation (which reloads), and uses an explicit blank-document boundary for fresh-entry tests; a previously rendered DOM is not proof that a pending navigation has finished.

## Reproduction

Start from a pinned clean revision and use the documented disposable loopback fixture in `field-velocity`; never run the historical credential-reading QA adapter. Serve with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, verify readiness separately, then pass these globals to the owned `browser-harness` session:

```python
QA_URL = 'http://127.0.0.1:<owned-port>/neuro-atlas/field-velocity?review=1'
QA_OUT = '/opt/data/tmp/<unique-evidence-directory>'
exec(open('<repo>/scripts/qa/expectations-related-browser.py').read())
```

The script fails closed outside loopback or a mismatched current origin. PR publication, preview availability, merge and authenticated hosted QA remain distinct states.
