# Complete affiliation Sankey — native verification

Runtime source: `aca9e1d763c6008f476ce185ba37d92368bc1e22`, based on owner-merged PR90 (`8d42d07654107002ba9dd53e435ea07c25adac59`), preserving PR88 copy cleanup and PR86 science history. These are real headed-Chrome captures of the production build with the actual bundled anonymous OpenAlex observations. The disposable clone replaces only the access proxy with a loopback/explicit-flag-only fixture; the release branch's auth proxy is unchanged. No hosted authentication or production update is claimed.

## Data and interpretation

- All sixteen source-derived endpoint cells are present, including same-sector endpoints and the two previously omitted origin sectors.
- 26,493 eligible researchers = 21,718 same-sector endpoints + 4,775 changed-sector endpoints.
- Every filled ribbon and node uses one shared people-count scale; label spacing and transparent interaction strokes do not inflate scientific values.
- First selected-topic publication in 2016–2025; at least two distinct active publication years. Same endpoint sectors do not establish continuous staying; missing affiliation is paper metadata.
- [Replay receipt and exact preservation](../../publications/endpoint-replay-20261106.md) distinguish the completed original primary replay from the unchanged science history inherited from PR86.

## Executed gates

- 237 focused publication, shared-export/typography/tooltip and reader-copy Node tests passed with bounded concurrency, zero failures/cancellations.
- 50 Python publication/acquisition/refresh tests passed.
- Typecheck, changed-source ESLint, diff whitespace check and production build passed.
- Native browser replay at 1440, 390 and 320 CSS pixels: exact 16-cell source identity; four origins/four destinations; source/target totals; common pixel/count ratio; eight nonoverlapping in-bounds labels; all full/preview labels at the canonical 12px; no document overflow; narrow plot's horizontal scroll reaches the destination labels.
- Native floating source popup/source link within the viewport at every width, keyboard focus/Tab, first-Escape popup dismissal/second-Escape chart close, source JSON exact table identity and archived null diagonals passed.
- The **actual Download PNG control** generated `export.png` (970,014 bytes); it retains the full chart, separate first/total/latest column headings, the PR90 PL R&D blue tab/logo, all sixteen flow values in notes and endpoint/missing-metadata qualifications even when a flow is selected. This is the native PNG, not a screenshot/print substitute. Its footer names the loopback source because this is local QA evidence.
- The final subtitle was read back in Chrome and names brain–computer interfaces/EEG and neural engineering rather than leaving the cohort unexplained.

The full unrelated Node suite is not claimed here. Native touch hardware and positive hosted password login are not tested. Narrow screens intentionally scroll inside the plot rather than shrinking the count labels. Very small flows remain proportionally thin and are accessible through widened transparent pointer targets, keyboard focus, source JSON and complete export notes.

## Evidence

- `full-1440.png`: complete desktop chart, unselected state.
- `full-390.png`, `full-390-right.png`: narrow chart and destination-side scroll.
- `full-320.png`, `full-320-right.png`: narrowest view and destination-side scroll.
- `preview-320.png`: compact rail preview.
- `geometry.json`: actual source/target counts, all ribbons, label rectangles/font sizes and document bounds at each width.
- `export.png`: actual native branded PNG download.
- `floating-source-1440.png`, `floating-source-390.png`, `floating-source-320.png`: actual source popup, contained in the viewport and outside the chart scroller.

Replay through the existing browser-harness window, from the repository root:

```python
import os
os.environ['SANKEY_QA_BASE'] = 'http://127.0.0.1:3320'
os.environ['SANKEY_QA_OUT'] = '/opt/data/tmp/task-native-evidence'
exec(open('scripts/qa/affiliation-sankey-browser.py').read())
```

Serve an isolated production build bound only to loopback with the existing documented local QA fixture; never change hosted auth or copy that fixture into the release branch. `NEXT_PUBLIC_BASE_PATH=/neuro-atlas` is the actual build setting. Fresh task-specific query values avoid reusing a same-URL document from a previous revision.
