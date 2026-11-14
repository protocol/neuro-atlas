# AI access — verification evidence

Runtime source: `eb9101e598e64c8523e9bbbf0335f54621a9bd24`, 2026-09-11.

## Executed

- Fresh `npm ci` and production `npm run build`: passed.
- Default tests: 104 passed. New envelope regressions were first observed failing (3/3), then passed after correction.
- Typecheck and ESLint on changed code: passed.
- Independent review: PASS on this runtime revision. Private envelope text, hidden timeline date bounds, and summaries depending on hidden observations were independently retested in JSON and Markdown. Current-source parity remains intact.
- Production server with **unmodified authentication**, port 3182: 357 requests over 306 unique resource paths denied without credentials, including all new data routes and bypass hints.
- Separate loopback-only UI fixture on port 3181: 16 HTTP entry/link checks and 16 pagination/source-parity/invalid-input checks passed. All 284 records are represented; funding data matches committed source fields exactly.
- Real Chrome at 1440, 390 and 320px: guide has no document/heading overflow; copy-prompt gesture and footer-to-guide navigation passed. Actual full-context download produced `neuro-atlas-full.md`, 319,853 bytes.

## Screenshot provenance

These are actual **local** Chrome screenshots of `/ai`, not deployed previews. Only the disposable UI checkout used a loopback-host authentication fixture. That fixture is **not in this branch**. Protected deployment login was not exercised and the gate was not weakened.

- `ai-1440.png` / `ai-1440-full.png`: desktop, viewport and full page.
- `ai-390.png` / `ai-390-full.png`: mobile, viewport and full page.

## Limits, not greenwashed

- The unchanged dependency set reports three baseline advisories (two high, one critical); this feature does not remediate them or constitute full-site security approval.
- Repository-wide lint has three reproduced baseline errors in untouched components; changed-path lint passes.
- One unchanged modal test was intermittent in independent review; isolated and subsequent full reruns passed. No cause was inferred.
- The read-only reviewer omitted Next-generated types and its raw standalone `tsc` consequently reported missing `LayoutProps`. Parent generated-type typecheck and the actual production build pass.
- Read-only keyword/filter queries are not natural-language inference. `llms.txt` is an entry-point convention, not guaranteed automatic discovery or a license grant.
- No production deployment or merge is part of this evidence.
