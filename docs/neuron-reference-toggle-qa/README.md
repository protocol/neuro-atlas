# Anatomical reference visibility — historical native evidence

Superseded by the owner’s single grouped-toggle correction. These captures document the earlier per-species implementation only; current evidence and the one-toggle contract are in `../neuron-single-toggle-qa/README.md` and `../neuron-count-reference-lines.md`.

Actual headed-browser captures of the production build at runtime
`cba20eb3c618ecb6b7e83bf5f76fab8d21d1f68b`, using an isolated loopback-only QA
fixture. These are neither design mocks nor production captures. The fixture is
not in the source branch. Subsequent evidence/test-only commits do not change this
runtime; their binding is checked before the PR handoff.

## Visible behavior

- Separate Mouse, Macaque and Human switches; all three are on by default.
- Each switch changes only its anatomical reference line and label. The axis uses
  only visible references; all off restores the observation-only range.
- All ten connectome observations and complete source definitions remain.
- The compact card stays the all-on summary at its existing 300px height.
- Fresh links, reload, legacy links, Copy link and Back/Forward preserve the
  selected subset through the chart-qualified `neuronRefs` query. Default all-on
  has no parameter; all-off is `none`.
- Native PNG and ClipboardItem image/link payloads describe the selected view.
  This evidence does not claim successful pasting into a particular external
  editor.

## Native checks

All eight subsets were exercised with actual pointer controls at 1440/390/320px
(24 cases), retaining ten source IDs/rows and all three source definitions. Enter
and Space, focused-toggle tooltip clearing, one-action Escape, repeated unrelated
query fields/router state, fresh/reload/legacy entry and history restoration were
also checked. Source popovers remain dismissible; when one covers the center of a
switch on a narrow viewport, keyboard activation still clears it and preserves
focus. Ordinary pointer switching is tested without clicking through a popup.

Actual Download PNG output was decoded for all-on, Mouse-only and all-off.
Visible reference text and the retained quantitative lines match the selected
subset; interaction-only SVG attributes are intentionally removed by the existing
serializer. Native clipboard readback confirms PNG/HTML/plain text and the
Mouse-only URL, with unrelated query entries excluded from the export link.

The earlier default-view browser replay was retained and rerun: 1440/390/320px
compact cards remain 300px, all labels/axes/marks fit inside their actual clipping
ancestors at initial scroll position, and dark/legacy entry remains functional.
Responsive pointer emulation is not a physical-phone touch test.

## Images

- `desktop-all-on.png`: all three switches and references.
- `mobile-mouse-only.png`: Mouse on, Macaque and Human off, 390px.
- `mobile-all-off.png`: observation-only scale, 320px.
- `selected-export-none.png`: actual all-off Download PNG callback.

No merge or production deployment is included.
