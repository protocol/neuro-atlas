# Single grouped neuron-reference switch — native evidence

Owner correction November25: one show/hide toggle for all Mouse/Macaque/Human reference lines, like the neighboring chart. This replaces the earlier per-species controls, not the observations.

Actual headed Chrome captures of a normal production build pinned to runtime `9440da5a409e4706d9d627b58d8f75894c70d8fb`. The isolated local QA build substitutes a guarded loopback-only synthetic auth boundary, never committed or deployed. These are real rendered chart screenshots, not mocks or production captures.

- `desktop-on.png`:1440px, all3 lines/labels, exactly1 switch below SVG.
- `mobile-on.png`:390px, same grouped on state.
- `mobile-off.png`:390px, switch off, no anatomical lines/labels, observation-only scale.
- `manifest.json`:source capture names and verified image hashes.

Parent independent native replay at1440/390/320 checked defaultoff→on→off, ten observation IDs/rows, all3 source definitions and exact selected JSON, unchanged compact card, restored geometry, pointer/Enter/Space/focus, pinned-tooltip clearing, actual Download PNG in both states and native clipboard PNG/URL, Copy link, fresh/legacy/reload/Back/Forward and one-action Escape. Clipboard raster pixels match actual on-state Download PNG. Fifteen served assets matched the pinned build before and after replay.

On URLs explicitly select all3 source-ordered IDs (`neuronRefs=mouse,macaque,human`); off omits the parameter. Prior valid nonempty subset links normalize to groupedon; prior `none` opens off. Source definitions stay complete even when context is hidden.

Limits: responsive pointer emulation is not a physical-phone touch test; no external-editor paste claim. Inherited narrow header-action cropping and source-popup occlusion are not claimed fixed. This evidence does not authorize merge or production release. Final source/test and hosted deployment receipts are in the PR description; retain each capture's actual runtime identity rather than relabeling it after an evidence-only commit.
