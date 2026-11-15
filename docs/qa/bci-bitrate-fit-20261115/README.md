# Computed BCI trendline and recovered-source verification

## Requested result

Replace the traced line with a data fit; slight deviation from the reference is accepted. Fit all 14 existing approximate plotted observations using equal-weight ordinary least squares of **log10(rate)** against year. An unconstrained intercept is estimated. The two line endpoints bound the observed 2000–2025 domain; no forecast/confidence band is drawn.

Separately, locate the real original figure and study data. The original public **figure** was found in [Sumner L Norman's June 22 post](https://x.com/SumnerLN/status/2069192808016273813), confirmed against the exact [published raster](https://pbs.twimg.com/media/HLc_CpXaIAA-nFr?format=jpg&name=orig). The [study-data package](../../bci-study-data/README.md) provides original reported values/units and primary/retrospective distinctions. Original numeric table/code and four anonymous assignments remain unavailable. The chart still fits reconstructed coordinates, not a newly recovered common-rate source table.

## Revision and numerical acceptance

Tested runtime: `112ef117cbe49fc0b063ce24e89840f76dfb9247`.

`fit-model.json` is exported from the actual runtime module:

- n = 14, x origin = 2000.
- log10 intercept = −0.9357557362966662.
- log10 slope/year = 0.060226873134295214.
- R² in log10-rate space = 0.46008243809440685.
- Fitted endpoints ≈0.115943 and ≈3.714635 bits/s at years 2000 and 2025.

An independent Python calculation reproduced these to floating-point tolerance. Original observation objects, native-source objects, calibration and earlier archived trace coordinates remain unchanged.

## Executed checks

- Test-first RED: helper absent, then fitted model/label absent. GREEN: **36 focused tests passed**, including input validation, repeated-year equal weighting, unconstrained intercept, fit residual orthogonality, constant-output R², exact 14-mark/source preservation, actual export callback, original scientific-copy controls and rail behavior.
- `npm run typecheck`: exit 0.
- Real-source production build and separately isolated fixture build: both exit 0.
- Independent bounded review: **PASS** for math, fit integration and source-data package. Reviewer independently reproduced coefficients, reconciled 10 labeled records/nine numeric/Kennedy blank, 19 primary historical records and eight retrospective records. Its three requested test files passed 10/10 with the repository's tsx loader. This was not a new full-suite or exhaustive independent paper audit.
- Native headed Chrome at **1440/390/320px**: exact title, fit in preview/detail, two monotonic fitted vertices, visible **Log-linear fit · 14 approximate points** key, correct descriptive method/R² text, 14 observation marks/14 source rows, no resting tooltip, bounded controls/document/SVG text, known-source/native-value and unknown/no-fake-link inspection, first/second Escape, trusted rail-card open, focus return and Back/Forward.
- Native Copy link clipboard readback at all widths; native Download PNG and Copy chart clipboard PNG at desktop. Clipboard has `text/plain`, `text/html`, `image/png`; temporary loopback clipboard-read permission restored. Actual 2400×2296 PNGs were decoded and visually inspected for fit, qualified key/values/units, all 14 identities and branding.
- All **12 served JavaScript/CSS assets** match this fixture build. Exact build ID, asset hashes and capture hashes are in `acceptance.json`.

## Boundaries

Images here are actual UI/exports from a task-owned, explicitly enabled loopback-only production-build fixture. The fixture proxy is outside the source branch. Local footer URLs identify that origin; these are not hosted chart screenshots or positive hosted authentication evidence. Access/launch/package files and generic renderer remain unchanged from the preceding PR head. No merge or production publication occurred.

Previous no-fit and traced-line evidence folders remain historical and are not relabeled as this fit. Earlier full-suite counts are not claimed for this exact follow-up.
