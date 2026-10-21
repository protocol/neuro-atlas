# Expectations related measurements: local evidence

## Provenance

- Base/main: `6603d9b8fec4b3ac9438a1c2b7aba2ce505c3967`.
- Before screenshots: retained loopback build at `8fe8412c035a9d9c776dd5dd20c99aade82c7a7e`; independently verified no runtime/data/config delta from base/main.
- After screenshots and `native-results.json`: `3114a8618e8eca3505fdd26cd19caecfbed32494`.
- Both run the actual production Next application under `/neuro-atlas/field-velocity`, with only a disposable `proxy.ts` passthrough in a separate, loopback-only worktree. That fixture is never committed, pushed or deployed. Production auth/routing remains unchanged.
- Images are headed-Chrome local captures, not authenticated hosted acceptance. Responsive keyboard/pointer tests do not establish physical-phone touch behavior.

## Verified behavior

`npm test`: **260 passing, zero failed**. Typecheck, changed-file ESLint and production build passed.

`scripts/qa/expectations-related-browser.py` ran in the task-owned browser at desktop 1440 and mobile-emulated 390/320 widths:

- All five links at each width (15 cases), including native pointer/Enter activation, actual plotted observations, query/base-path preservation, category reveal, settled target scrolling, and Back/Forward heading/origin-link focus.
- All five fresh direct URLs reveal the plotted target (5 cases).
- A prior no-match Metrics search is cleared when an Expectations related link reveals its target (1 case).
- Separate forecast disclosure open/close at every width; existing external questions open in a new tab.
- Equal document client/scroll widths at every tested width.

The initial probe checked target geometry immediately after heading focus and before the existing second-frame scroll. Live readback showed the scroll settled correctly at 96px. The corrected probe waits for both conditions; no product change was made for that timing issue. The final native result records **21/21** cases, plus forecast and layout assertions.

## Reproduction

Start from a pinned clean revision and use the documented disposable loopback fixture in `field-velocity`; never run the historical credential-reading QA adapter. Serve with `NEXT_PUBLIC_BASE_PATH=/neuro-atlas`, verify readiness separately, then pass these globals to the owned `browser-harness` session:

```python
QA_URL = 'http://127.0.0.1:<owned-port>/neuro-atlas/field-velocity?review=1'
QA_OUT = '/opt/data/tmp/<unique-evidence-directory>'
exec(open('<repo>/scripts/qa/expectations-related-browser.py').read())
```

The script fails closed outside loopback or a mismatched current origin. The release check separately verifies served client asset bytes against the exact built worktree. PR publication, preview availability, merge and authenticated hosted QA are distinct states.
