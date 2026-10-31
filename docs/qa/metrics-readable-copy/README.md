# Metrics copy and readable cost units

Runtime tested: `d873bcb2ec1e266a50d304d3bc38aaab394b705f`.
Base: `1e186b563a0953febcb413a15e0c59ff1ffefdcf` (merged PR #72).
The before screenshot is from `32d133decc01d979b23d2a7038d64a10360d384f`, verified runtime/source-equivalent to that base for `src`, `public`, and package files.

## Changes verified

- Removed the requested Mapping Scale, NeuroAI and recording-hours disclaimer sentences, including repeated NeuroAI point notes and recording-hours dataset scopes.
- Renamed the first section **Neurotech field engagement**, retaining category and deep-link identities.
- Public acquisition cost is **dollars per million voxels**: every archived dollars/voxel value is multiplied by 1,000,000. All nine approximate source estimates and their protocol/resolution/PEEM prospective distinctions remain. Approximate readouts use three significant digits; coordinates retain full precision.
- ExLLSM reads **≈0.001 $/million voxels** and **Approx. Voxels/$ = 1,000,000,000** in inspection and source rows. The display conversion also reaches exported PNG text.
- Edited descriptions state their scope directly. Verbatim quotations and specific scientific qualifications remain.

## Evidence

- `verification.json`: all **85** archived observation identities/numerical/source fields unchanged; all non-prose evidence fields unchanged; seven protected auth/provider/package/link files byte-identical to base; nine served JS/CSS files matched the pinned build. **462 tests passed**, zero failures/skips/cancellations. Exact runtime typecheck, production build and changed-file ESLint passed.
- `native-cost-results.json`: actual pointer interaction at **1440, 390 and 320px**, per-million axis and all nine rows, ExLLSM grouped source value/readout, stable expand/collapse viewport/common height, Escape and exact-trigger focus return. No document overflow at requested widths.
- `native-height-results.json`: all **20** cards remain equal-height and measurable at those widths.
- `native-copy-results.json`: actual opened Mapping, recording-hours and NeuroAI modals omit the three exact rejected phrases.
- Independent source/copy review passed at `564aea6`; bounded final review passed at `d873bcb`. The sole review finding, **F1** (incomplete mobile captures), is closed by the recaptured preview and paired inspector images. All required review and exact-runtime check processes completed before publication.
- `cost-export.png`: actual app-generated PNG from the real Download PNG button. The loopback QA intercepted its download anchor to save bytes without changing shared browser download settings. Its title/axis and nine qualified values were visually inspected.
- Mobile inspector evidence is paired: `after-exllsm-details-390.png` shows the readout, while `after-exllsm-source-note-320.png` shows its internally scrolled source note. These are ordinary native scroll states, not expanded/reformatted screenshot substitutes.

All screenshots are from the real production-built route on an isolated loopback clone. Only its uncommitted proxy fixture differs from the tested source; production auth is unchanged. Local native evidence does not establish authenticated hosted rendering or physical-phone touch behavior. The hosted preview's deployment identity and access gate are verified separately in the PR handoff. No production merge or automated Trends refresh is part of this change.
