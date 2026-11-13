# Milestones header status removal

The Milestones hero no longer displays the `Live` status pill or its adjacent separator. Shared status rendering remains available to other pages. No timeline data, filtering, feedback, gate, or other action changes are included.

## Rendered evidence

Native headed Chrome against a task-owned loopback Next.js production server, using a synthetic local-only password. These are local screenshots, not authenticated hosted-preview screenshots.

- Baseline source: `5015d2cc27a2c63babbdc0ad93d975724a25b84b`, standalone `/milestones`.
- Candidate runtime source: `ca81d974cac4202a25da74d29a251db3193000de`, mounted `/neuro-atlas/milestones`.
- `before-desktop.png` / `after-desktop.png`: matching 1452×1425 viewport, cropped to the changed hero. The pill and separator disappear; title, description, metadata, statistics, and actions remain.
- `before-mobile-320.png` / `after-mobile-320.png`: actual 320×740 mobile-emulated viewport.
- `native-report.json`: candidate DOM and width assertions at 1452, 390, and 320px. Desktop client width excludes its scrollbar; mobile inner/client/scroll widths match. The real BCI-only filter was also activated with a native pointer click after the captures.

## Verification

- Test-first regression failed on the baseline's extra `•` / `Live`, then passed after removing only the Milestones page's `status="live"` prop.
- All 27 focused Milestones/shared-hero tests passed. The final test cleanup avoids coupling this change to a fixed number of years or the independently configurable side-panel default.
- Production build, typecheck, changed-source ESLint: passed. Production dependency audit: zero vulnerabilities.
- Independent code review of the runtime change and initial regressions: PASS, no material findings. Subsequent changes are test/evidence-only; the runtime source is identical.
- **Full suite is not green:** the ordinary `npm test` run reached its 600-second execution limit (1160 passed, one recording-UI assertion failure, 14 canceled). A bounded rerun was stopped after the chart-sharing cases timed out/failed. An isolated unchanged-main replay independently reproduced chart-sharing and readable-URL timeouts; the recording-UI file passed that replay. No unrelated chart/test fixes are included or claimed.

No merge or production rollout is part of this change.
