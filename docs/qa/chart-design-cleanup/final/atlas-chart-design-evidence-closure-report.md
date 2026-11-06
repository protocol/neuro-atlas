CANDIDATE — The final visuals resolve the requested design/export concerns, but F3 remains P1 because the all-chart receipt does not substantiate all claimed desktop detail visits.

## Scope and verdict

Second and final bounded closure: F3 evidence only, at cf14f32109ebe5434ca015d307390d9bcee0671d. No new design/code hunt, tests, build, browser control, delegation, code edits or remote writes. Read-only HTTP checks verified the existing loopback runtime. This report is the only file written.

## Material defects — F3 located checklist

All evidence filenames below are under /opt/data/tmp/atlas-allchart-final-evidence/.

- PASS — Attribution and file integrity. Clone HEAD and QA HEAD both equal cf14. The served /field-velocity response has x-atlas-qa-revision equal to that full SHA. QA .next/BUILD_ID equals provenance qaBuildId, kqUMl5I0Xtj5BUDiDysP0. Independently compared tracked source/assets and other tracked files between the reviewed clone and QA copy: no differing tracked file except src/proxy.ts. All 22 manifest-listed files match their declared SHA-256 and byte lengths. recording-electrical-native.png is byte-identical to the hashed recording-branded-native.png. The existing production-build log records successful compilation and page generation. Non-loopback Host independently returns 403.

- PASS — Actual broken x-axis. Visually inspected design-contact-sheet.png, bottom-right card, and neuroai-native.png: the old unbroken decimal axis is replaced by integer ticks on 0–6 and 40–42, visible break slashes, and an explicit omitted-range/same-scale disclosure. Five clustered spiking observations have horizontal breathing room; the baseline outlier remains visible. neuroai-publications-native-report.json /neuroai records six points, equal segment slopes at each width, and the exact 41.77 mJ/image source popup. The unchanged zero-based y range is not reopened.

- PASS — PR86 native presentation. annual-shared-tooltip-desktop.png visibly distinguishes papers from the science index and shows the shared 2022 popup: 9,726 papers, all-research index 100, four-domain index 100–100. The corresponding report records annual-native.png generation. No units/shared-year regression is evidenced.

- PASS — Native exports. Visually inspected recording-branded-native.png and recording-optical-native.png: populated plots, white backgrounds, readable measurement/source disclosures and PL R&D branding. neuroai-native.png has the same native treatment. native-export-results.json /exports records electrical/human-channel/optical generation with 3/2/1 points; /clipboard records actual image/png, text/html and text/plain readback. The capture script intercepts the actual download blob rather than recreating a plot. Loopback footer links accurately reflect this local QA environment, not hosted/public delivery.

- PASS — Narrow Milestones/Funding surfaces. Visually inspected milestones-320.png and funding-390.png. Month/timeline scrolling is intentional, not page overflow. milestones-funding-native-report.json records year 2025 selection, stage expansion, successful month scrolling, Funding stage/investor views, financing readouts and no page overflow at 1440/390/320.

- FAIL — Complete desktop detail coverage. all-chart-native-report.json /0 has 24 preview records but only 21 distinct dialog titles. Pairing previews and dialogs by index reveals three wrong-chart captures:
  - /0/previews/1: Citation latency; /0/dialogs/1/title: Neurotech search terms.
  - /0/previews/5: Publication growth by group; /0/dialogs/5/title: Neurotech papers per year.
  - /0/previews/15: Selected EM acquisition rates; /0/dialogs/15/title: Selected published maps — synapse counts.
  The 390px and 320px rows each have 24 distinct, correctly paired titles. The file contains 72 dialog records, but that is not proof of 72 correctly targeted detail visits. Equal preview heights and approximately 12 CSSpx labels are supported; they cannot repair the three missing desktop identities. This is a verified evidence defect, not proof that those charts or navigation are broken.

F3 — RETAINED, P1, limited to the three desktop acceptance gaps above. F1/F2/F4 remain closed under the prior closure report; they were not reopened. Newly introduced P0s: none substantiated.

## Assumptions and evidence gaps

The provenance's visit count overstates what the native report proves. Exact fix: supply correctly attributed native detail receipts for the three named desktop charts, including their populated content and source interactions; do not relabel existing wrong-chart records. No source fix follows from this evidence alone.

## Downside and failure map

- Calling this complete would certify three desktop chart details that the receipt actually captured as other charts. The parent and owner absorb acceptance/rework risk.
- Kill criterion: do not claim complete all-chart native acceptance on this receipt. Correct chart-identity evidence would reverse this remaining call; another design hunt is unwarranted.

## Better way

Keep the accepted visuals and localized implementation. Repair only the missing evidence, not chart code without a reproduced defect.

## Brevity and structure cuts

No new polish queue. Replace “72 actual dialog visits” with the verified coverage qualification until the three desktop identities are evidenced.

## Prioritized fix queue

1. P1 — F3: close the three located desktop detail-evidence gaps, or retain an explicit incomplete-acceptance/draft label. This is the final bounded review; no third hunt is requested.

## Residual risk and dissent ledger

The specific broken-axis request, preserved annual units/shared year, white native exports and inspected legibility pass. The objection that this is now only paperwork partly survives: no rendering defect is demonstrated, but duplicate chart captures cannot certify distinct requested details.

Separately, the parent reports 976 parallel cases: 975 passed and one history case failed; the six-case file passed its isolated serial rerun. This is not a fully green parallel run, and baseline regression status is not established here. Build/typecheck/scoped ESLint success and native-history corroboration remain parent-owned qualifications, not new F3 failures. Physical phones and hosted authentication were not verified or claimed.
