# Milestones capital panel — default open

The Milestones summary rail now starts **open**. Its existing 2026 annual and full-period capital totals are visible on desktop without opening the rail. This supersedes the November 13 folded-default choice for this panel only. Manual **Fold → Panel/Open** is retained.

The entire product-code change is `useState(false)` → `useState(true)` for `railOpen` in `src/components/milestone-timeline.tsx`. No capital calculation, data, filter, other layout, auth, noindex, feedback intake or processing setting changes.

## Checks

- Base: `de2301974ac1e66b35aaaec91198dc5dda8c060c` (fresh current `main`).
- Captured runtime: `e4df7e605a0bba12472beb457d8061ef06e4b21e`; later evidence-only commits leave runtime/tests unchanged.
- Failing-first: both server-rendered initial-summary and hydrated initial-summary/roundtrip tests failed on the old default because the summary was absent. The same native replay failed on the base at its first initial-summary assertion. `before-1440.png` is the real base UI.
- GREEN: all **27** focused Milestones and company-blog/Milestones tests passed. Three existing test setups no longer click an initially absent opener; every original capital/grant, layout/date and removed-copy assertion remains intact.
- Typecheck and Next 16.4.6 production build passed. Scoped lint reports the same two pre-existing timeline findings as base (`react-hooks/set-state-in-effect:148` and `react-hooks/immutability:186`); all other changed JavaScript/test files are clean. No lint rule is disabled.
- `native-results.json`: actual Next UI in headed Chrome at 1440, 390 and 320px. The 2026 annual and full-period displayed `$1.2b` are checked against the existing public `milestones.json` financing records, excluding grants. No new financial metric is introduced.
- Actual desktop pointer clicks fold the panel, widen the focused plot, then reopen the identical summary. Same-mount resize roundtrips preserve both folded and open state.
- **Responsive behavior is intentionally unchanged:** below the existing large-screen breakpoint, the rail and its manual controls remain hidden. At 390/320px the real document/client/scroll widths match the requested width, while the timeline retains its local horizontal scrolling. A mobile screenshot is not evidence of a visible mobile summary.

## Public-safe native captures

All images are actual local source UI, not hosted-preview captures. No private visitor feedback, tracker, message, credential or account screen is included. The fixture uses the real public dataset and components; only the launch gate is synthetic and loopback-only. It uses no real password, provider identity or provider write. Development-only Next tooling is hidden for the candidate captures.

- `before-1440.png`: base's initially folded rail.
- `initial-1440.png`: fresh page, no rail-opening click; 2026 annual and Full period capital visible, Fold available.
- `folded-1440.png`: manual Fold removed the summary and exposed the Panel opener/full-year plot.
- `reopened-1440.png`: native Panel/Open restored the same summary.
- `initial-390.png`, `initial-320.png`: preserved narrow layout and local timeline scrolling; rail hidden by existing CSS.

## Replay

Run from an isolated checkout with physical installed dependencies. The fixture launcher creates a **new** directory under `/opt/data/tmp/atlas-plr118`; do not reuse/overwrite an active fixture or install packages over its read-only hardlinked dependencies.

```sh
mkdir -p /opt/data/tmp/atlas-plr118
node docs/qa/milestones-panel-20261116/run-fixture.mjs "$PWD" "$(git rev-parse HEAD)" candidate 45831
# Verify HTTP 200 and x-atlas-qa-source equal that exact source SHA first.
# In a separately locked task-owned browser-harness window:
BU_NAME=milestones-panel-replay \
MILESTONES_QA_ROOT="$PWD" \
MILESTONES_QA_OUT=/opt/data/tmp/milestones-panel-replay \
MILESTONES_QA_ORIGIN=http://127.0.0.1:45831/neuro-atlas \
MILESTONES_QA_SHA="$(git rev-parse HEAD)" \
browser-harness < scripts/qa/milestones-panel-browser.py
```

The replay journals exact opened page IDs in its output directory. Close only those targets and verify their absence/pre-existing tab survival; stop the exact fixture process and verify its port closes before releasing the task's browser lock. The copied proxy is never a source/auth change and must never be committed or deployed to a hosted site.

## Boundaries

No merge or production release, hosting/environment/access change, Linear write, scheduled job or proposal-flow activation. Local native pointer QA is not physical-phone touch testing. The separate hosted preview retains its real gate; gate/status metadata is not authenticated hosted panel acceptance. The broader feedback/proposal pipeline was not re-audited for this one-line default-state change.
