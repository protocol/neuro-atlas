# Historical acquisition chart — native verification

Runtime revision: `9814197b6b39d0d2bf10791d969d6c02b9e24a9c`.
Paired current-main baseline: `c0ebfcbc22328f94692b503371cb316c10814df6`.

These are actual headed-Chrome screenshots and native Download PNG outputs from isolated, production-built **loopback QA** fixtures. They are not production or hosted-preview captures. The fixture was explicitly enabled, bound to loopback, raw-Host restricted and noindex; no fixture/auth change is part of this branch. Its nine served client scripts matched the exact local build bytes before and after replay.

## Verified behavior

- **122 combined affected tests passed**, with zero failures after reconciling recording-coverage main `913eb58f69ef385b5e4fc2cbc02c532bdb7a8a13` in source `88065588e0aae77ae04656009c85dba447dc3ec2`. Coverage includes acquisition modes/math, ordinary-motion reference switching, actual mounted URL integration, sharing/export sanitization, current source/provenance checks, readable aliases and the newly merged recording coverage/readability cases. This is a bounded relevant regression run, not a full-suite claim.
- The four disjoint-intent renderer conflict hunks preserve both features. Independent bounded review passed. The nine acquisition states and three fresh previews, sharing/clipboard/ordinary-motion replay and served-client-byte checks were repeated on the combined source. Native readback also retained the recording chart's 12 coverage rows, 24 direct bar labels and matched minute/hour averages. All three acquisition PNGs are **byte-identical** to the retained capture revision above; no screenshot is relabeled as a later capture.
- Typecheck, changed-file ESLint and production build passed. Scientific input files, immutable provenance fixtures/normalizers and dependencies were not changed.
- **Nine full-modal states:** historical voxels/$ with reference off, historical voxels/$ with the single reference on, and reciprocal $/voxel with no reference, at **1440, 390 and 320 px**.
- In each state, all ten point identities and transformed values match the canonical sources. The default view preserves the current-main source-point and fitted-line SVG positions exactly. The original source JSON is exactly unchanged relative to the paired browser baseline in all nine states; the table retains original voxels/$ units. The selected-view JSON explicitly declares its transformation and original fit basis.
- **Three fresh unopened previews**, with the clipping card's `scrollTop` reset to zero. The actual plot, source marks and 2015–2025 labels remain visible in the fixed-height card at 320 px. An SVG-bounds check alone is not evidence that an overflow-hidden card shows that SVG.
- Point details: all ten observations in both quantities at desktop, plus prospective PEEM and the ExA-SPIM author estimate in both quantities at both narrow widths. All three quantities, source/year and qualifications are present; popup rectangles remain within the viewport. Human-brain cost is explicitly illustrative, acquisition-only and not a matched whole-brain project budget.
- The single optional $1B acquisition reference is `1.875e12 voxels/$`, displayed as **1.88T**. The source `exaspim2024` estimate remains `1e11 voxels/$`, giving illustrative **$18.75B**; prospective PEEM remains `2e10 voxels/$`, giving **$93.75B**. Neither is relabeled as a demonstrated whole-brain budget.
- Actual Copy link → fresh open → reload passed for the three selected states, retaining repeated unrelated query entries. Back/Forward restored both quantity and eligible reference state. A retained legacy acquisition alias still opens this exact chart; the unpublished removed human-axis token sanitizes to efficiency.
- Native PNG download was captured and decoded for all three states. The reference-on PNG visibly retains **Human · 4×4×40 nm · image-only** beside **$1B · 1.88T**, keeping the modeled sampling explicit outside the website. Native image clipboard readback included `image/png` and a valid bitmap. Ordinary reference animation moved marks through multiple frames and disabled exports; switching reference-on efficiency to reciprocal immediately restored historical bounds without a hidden moving scenario domain.

## Images

| Artifact | File |
|---|---|
| Before: historical chart on current main | [before-desktop.png](before-desktop.png) |
| Default historical efficiency | [historical-desktop.png](historical-desktop.png) |
| Single optional $1B reference | [reference-desktop.png](reference-desktop.png) |
| Reciprocal quantity | [reciprocal-desktop.png](reciprocal-desktop.png) |
| Full chart at 320 px | [historical-mobile.png](historical-mobile.png) |
| Fresh unscrolled compact preview at 320 px | [preview-mobile.png](preview-mobile.png) |
| Illustrative point details at 320 px | [details-mobile.png](details-mobile.png) |
| Actual native historical PNG | [native-export-historical-local.png](native-export-historical-local.png) |
| Actual native reference PNG | [native-export-reference-local.png](native-export-reference-local.png) |
| Actual native reciprocal PNG | [native-export-reciprocal-local.png](native-export-reciprocal-local.png) |

The PNG footer uses the loopback origin because these were generated locally. The application's footer follows the actual current chart URL; these local files are QA evidence, not a public chart-link handoff. Desktop Download PNG success toasts in some UI captures are ordinary native action feedback, not additional chart content.

Independent review and hosted-preview identity are recorded at PR handoff. Nothing here claims a merge or production release.
