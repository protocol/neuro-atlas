# Clean information-link chart images

## Current result

The shared Copy chart / Download PNG serializer no longer paints the long
footnote block. Every image ends with the existing official PL R&D logo,
**More information on Neuro Atlas.**, and the existing clean chart URL.
Title, plot, axes, plot annotations, legend, source geometry and selected state
are unchanged. The on-site source/data notes and their paragraph styling remain.

## Native evidence

Actual default-production build at `11b38cf56da3f777645ed773af15487279ae8e2a`.
A later evidence-only commit does not change runtime or tests. The isolated
loopback-only QA proxy is not part of the release.

Seven actual PNG downloads: recording-hours desktop and390px, optical recording,
NeuroAI, Google Trends, publication growth, and the complete affiliation Sankey.
`results.json` records zero painted footnote blocks and exactly one referral in
every image, unchanged source-shape/coordinate checks and native clipboard
PNG/HTML/plain-URL readback. Clipboard pixels equal the narrow-source PNG.
The on-site recording-hours disclosure still has five dataset-note paragraphs.

Local footer URLs honestly identify this build's origin; these are not hosted
production screenshots. Source notes survive only in the intermediate inert SVG
`desc` evidence, not as PNG text or a hidden raster footnote. The exported SVGs
are verification artifacts, not a new download feature.

The replay diagnosed table-row-versus-SVG-point counting, the current Sankey
title, and a Copy button scrolled behind the sticky header. Scientific shape
checks completed for all seven downloads. A separately resumed native Copy
phase centered and hit-tested the actual control, then passed. No product change
was made to bypass a failing native click.

## Checks and qualifications

- Strict RED/GREEN for one referral, no visible notes or legacy caption block,
  preserved logo/link/point coordinates, and note-independent image height.
- 72 focused export/sharing/publication/axis tests passed.
- Production default Turbopack build, typecheck, scoped ESLint and diff passed.
  The isolated build temporarily materialized installed dependencies to avoid
  Turbopack's sibling-symlink root limitation; no dependency/config edit.
- Whole concurrent run: **1,070/1,071 passed**. The unchanged modal-history
  Forward assertion failed its fixed settle; this is not an all-green suite.
  Its isolated serial file passed6/6. Real Chrome native open/close,
  Forward restore, Back close and scroll unlock also passed; see native-history.json.
  No modal/history implementation or timing assertion was changed to hide it.

Source data, source prose on-site, authentication, image safety limits, URL
sanitization and clipboard formats are unchanged. Viewport-emulated pointer
checks do not establish physical-phone touch or recipient-app paste behavior.
