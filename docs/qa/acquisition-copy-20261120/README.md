# Acquisition reference notice follow-up

The reciprocal **$ per voxel** view no longer displays a human-brain availability notice or a replacement placeholder. The reference switch and optional $1B overlay remain exclusive to **Voxels per $**. Switching back restores the switch in its Off state.

## Scope and verification

- One conditional text node and its unused CSS rule removed; no data, arithmetic, fit, reference definition, route or export semantics changed.
- Mounted regression failed first on the old notice, then passed after removal. The test also checks no reference control in reciprocal and its Off-state return in efficiency.
- 76 affected acquisition, URL, benchmark and recording tests passed; typecheck and scoped lint passed at source `6eabb6726ff8d47e0611e7b5e027739e0bd67344`.
- Actual hosted preview replay at 1440 and 320 px exercised default efficiency, enabled reference, reciprocal, reload and restored efficiency. Every point value, original-source JSON, point/fit geometry, reference and URL state matches the preceding preview in all compared states; only the notice was removed.
- Prior broader chart verification is retained separately in the parent evidence directory; this follow-up does not claim a new whole-repository test pass or production release.

The before images are hosted preview captures at `e6adf09230e7d04ab17f93634deecac27f0a2b43`. After images are hosted preview captures at `6eabb6726ff8d47e0611e7b5e027739e0bd67344` (READY Preview `dpl_2nGAHLfnzZsJA4afrTXSZsWVjxPD`), not production. The edited route returned HTTP 200, `x-matched-path: /field-velocity`, and noindex. The optional BCI sensory view from separately merged main `50c68f9` was reconciled in source `0507e510bd957d7c2138c57f56d8a30d6c889b89`; the two acquisition default/preview SVGs match the isolated premerge baseline, and all 28 other default/preview SVGs retain the incoming frozen main hashes. The original golden fixture remains unchanged; a separately pinned two-entry acquisition display baseline records the intentional difference.

## Captures

- [Before: reciprocal desktop notice](before-desktop.png)
- [After: reciprocal desktop](reciprocal-desktop.png)
- [After: reciprocal 320px](reciprocal-mobile.png)
- [Retained efficiency-only reference at 320px](reference-mobile.png)
