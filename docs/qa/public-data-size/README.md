# Public data size: verified PR evidence

Runtime: `0244b074d08e7506741a891ab647581d53375af8`.
Baseline: `1b7284e2dc9fa086f66cc05c7b07d8b957fd208b` (merged PR #74).

## What changed

- Plain `Resource size (PB)` axis across preview, detail, source table and app-generated PNG.
- All five prior published values, citations, quotations, dates and bounds preserved. Visible groups separate published image sizes, published resource sizes, and measured image size.
- New MaleCNS JPEG-pyramid point: 50,910,260,068,834 stored bytes / 10¹⁵ = 0.050910260068834 PB, with November 3, 2026 measurement date and October 2025 initial release distinguished.
- Six numbered dataset keys retain their PB amounts. The standalone PNG also retains canonical measurement/release date, same-specimen identity, exact bytes, all-11-level JPEG scope, excluded products and 0.054 mm³ tissue extent.
- Reproducible metadata-only inventory, compact immutable object snapshot, audit and regression coverage. The size-only metadata-record provenance exception is explicit; no historical generation/timestamp is invented.

## Verification

- 475 tests, typecheck, production build, changed-file ESLint and independent review passed at the runtime above.
- Native desktop 1440px and mobile-emulated 390/320px: six marks, all six source rows, exact stored-byte inspection, plain PB, product groups, modal Escape and focus return, no document overflow and all 20 preview cards equal height.
- Actual Download PNG output inspected; the capture is the application's SVG-to-PNG export, not a source-rendered stand-in.
- All 85 historical observations preserve numeric values, source identities, quotes, date labels and qualifiers. Every other chart's evidence is deep-equal to baseline. Seven protected archives/link/auth/package files are byte-identical. Nine served CSS/JS assets match the pinned loopback build.
- Final review closes F1 (export date/specimen/product scope) and F2 (overstated per-object provenance). Original review retained as history; it is not the final verdict.

## Evidence limits

These are actual production-built-route screenshots on a guarded loopback clone with a disposable, uncommitted proxy fixture. Production authentication was not changed. Exact-head Git-triggered preview identity, READY status, Basic gate and noindex are verified separately; authenticated hosted rendering and physical-phone touch behavior are not claimed.

The chart preserves individually scoped reports and one measured product; it does not establish a homogeneous global supply trend or quantify the compression contribution. Source audit: `../../public-data-size-audit.md`.
