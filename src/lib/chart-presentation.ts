/** Visual sizes, not data encodings. Overlap rings are multiples of the base radius. */
export const CHART_PRESENTATION = {
  // Screen-space type roles; family CSS is regression-checked against these.
  previewTitleFontSize: 16,
  modalTitleFontSize: 18,
  labelFontSize: 12,
  supportingFontSize: 12,
  previewRadius: 4,
  expandedRadius: 5,
  denseLineRadius: 2.5,
  focusRadius: 7,
  markerStrokeWidth: 1.5,
} as const;
