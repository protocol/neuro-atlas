# BCI chart — five-year year labels

## Requested change and scope

Show calendar-year labels every five years rather than the previous sparse min/middle/max labels. Only BCI opts into `yearTickStep: 5`; all other plot defaults and numeric/energy axes remain unchanged.

Runtime **9975109821b8ccca4eec2ab4ff8687b329c1ad9c**. Subsequent evidence-only commits preserve the runtime/tests exactly. No data selection, coordinate, fit, source-note, package/configuration, authentication or release change. Original-source methodological research is a separate private deliverable, not a source-data edit in this commit.

## Verified result

The real rail preview, opened chart and native PNG show **2000,2005,2010,2015,2020,2025**. At1440/390/320px the six year labels are present, in domain, and their actual native text rectangles do not overlap. Native PNG2400×2348 and mobile320 pixels were inspected; R², attribution labels and all14 observation keys remain.

- Strict RED→GREEN renderer and real BCI integration tests demonstrated the missing five-year labels before implementation. Invalid/zero/nonfinite/excessive step requests fall back to existing behavior; allocation is bounded at100 ticks.
- Parent independently ran **123/123 focused BCI/draft/fitter/energy-axis tests**, source and disposable-fixture production builds, typecheck, scoped ESLint and diff checks, all passed. No all-green full-suite claim is made; the earlier unrelated analytics timing qualification remains in the prior provenance QA.
- Independent code review **PASS**, no security or logic concerns. Nonblocking suggestion: add exactly100-tick and fractional-domain endpoint tests; existing tests cover101-label fallback and calendar alignment. See `code-review.json`.
- Full model comparison after removing only `yearTickStep` is exactly equal to the prior accepted plot/fit: values, years, sources, candidates, notes, PL R&D estimates, R² and immutable methodology URL all unchanged. See `parent-model-verification.json`.
- Actual headed Chrome at1440/390/320: exact chart identity, all14 marks/rows/keys, six year labels in modal and preview, strict bounds/nonoverlap, point/candidate/calculation inspection, Escape/focus/history, Copy link readback, native Copy chart and Download PNG passed.
- **16 served static assets** match the exact fixture bytes; revision header matched9975109. Fixture proxy remained opt-in/Host-restricted/noindex, uncommitted and unpushed; production auth unchanged.
- Task-owned tab closed, preexisting tabs preserved, own browser hold released and exact task port closed.

Screenshots are actual **local loopback-fixture** output, not authenticated hosted acceptance or production publication. Local-origin image footer is expected. The existing hosted access/noindex gate is verified separately. No merge or production deployment is authorized by this change.

## Evidence

`bci-bitrate-native-export.png` and clipboard counterpart are actual native outputs. `chart-desktop.png`, `chart-390.png`, `chart-320.png` show each size; `plrd-estimate.png` preserves the source-inspection state. `native-qa.json` includes all six tick strings and measured rectangles. `artifacts.json` records hashes; served assets, clipboard, model reconciliation and cleanup have separate receipts.
