# Researcher-sector typography — checked local evidence

Runtime source: `aadfaed2f86aa40ea2a5700d7554dbd87e9f91c8`; baseline: `da47c18254457824aff5107821debb0bac69227c`.

## Requested change

The researcher-sector waffle keeps its scientific values, 100-square allocation and category colors. The expanded key now uses **24 CSS-px bold counts/percentages** and **16 CSS-px sector labels** rather than 12px for both. Extra baseline separation prevents glyph overlap. Explicit validated per-label export roles preserve the same hierarchy in Copy chart / Download PNG; other charts keep their existing normalization.

## Evidence

- `before-desktop.png` and `sector-type-1440.png`: matched 1440×1000 light-theme captures from baseline and candidate production builds.
- `sector-type-320-labels.png`: native internal horizontal scrolling reveals all enlarged labels; the independent HTML key remains readable beneath it.
- `sector-export-1440.png`: actual native Download PNG handler, intercepted only at the final loopback download anchor; the local-origin permalink is expected in this local evidence.
- `native-results.json`: 1440/390/320 CSS-px geometry, exact chart identity and values, 100 marks, empty initial inspector, no document overflow, no pairwise text overlap, 24/16px actual CTM-scaled type, source popup/focus/first-Escape and actual PNG handlers.
- `parity.json`: production source/assets match the isolated QA copy, except its explicitly enabled, Host-restricted, noindex loopback proxy fixture. The real source proxy is unchanged.

The loopback fixture was never committed to source or deployed. These are **local native** checks, not positive authenticated hosted UI acceptance. The production route remains behind its original gate; the managed browser blocked its host during this task.

## Checks and review

- Test-first regression failed on the original small type, then on export flattening; passed after both corrections.
- Focused typography/tooltip/export suites: 27 passed. Full suite: 1,073 passed, zero failures.
- Source production build, typecheck and changed-source ESLint passed. Final spacing was exercised in the isolated production rebuild and full native replay.
- Independent bounded code critic: PASS on the runtime commit. Parent inspected the actual desktop, narrow and downloaded PNG images. Final evidence-only changes receive a separate bounded closure review.
- No source-data, acquisition, feed, dependency, gate or production-deployment changes in this PR.

## Current values and reference comparison

The existing Atlas snapshot was independently acquired from OpenAlex on November 6, 2026, observing publication years through December 31, 2025. The reference used an October 14 author snapshot. Both describe 2025, not different headcount years.

| Sector | Reference | Current Atlas |
|---|---:|---:|
| Universities | 22,854 | 24,228 (78.2%) |
| Other institutions | 3,998 | 2,787 (9.0%) |
| No listed affiliation | 4,449 | 3,639 (11.7%) |
| Companies | 299 | 347 (1.1%) |
| Total | 31,600 | 31,001 |

The Atlas build has its own documented author-year sector assignment and deterministic tie-breaking rules; the old aggregate alone does not establish author-level equivalence. The aggregate comparison cannot attribute every numerical difference between refreshed metadata, cohort membership and classification. This typography change leaves the snapshot byte-for-byte unchanged.
