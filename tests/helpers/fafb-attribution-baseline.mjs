import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// Exact public evidence bytes from 0f2045b102828b2d6bf6a7ce5d3756c379647d44.
// Keep the historical raw/scientific goldens; permit only the approved attribution delta.
export const preAttributionBytes = gunzipSync(readFileSync(new URL('../fixtures/fafb-pre-attribution-evidence.json.gz', import.meta.url)));
export const preAttributionEvidence = JSON.parse(preAttributionBytes);
const points = Object.values(preAttributionEvidence).flatMap(e => e.plots).flatMap(p => p.points);
const ids = new Set(['flywire-fly-neuropil-2024-01-01','flywire-neurons','flywire-synapses','flywire-proofreading','fafb-image-download-2018']);
const plotIds = new Set(['tissue-cm3','largest-connectome-neurons','largest-connectome-synapses','proofreading-effort','public-data-size']);
const credit = 'FAFB / FlyWire — EM imagery: Zheng, Lauritzen et al. (2018) · Connectome: Dorkenwald et al. / FlyWire Consortium (2024)';

export function beforeFafbAttribution(evidence, restoreRawNotes = false) {
  const restored = structuredClone(evidence);
  for (const entry of Object.values(restored)) for (const plot of entry.plots) {
    if (plotIds.has(plot.id) && plot.datasetCredit !== undefined) {
      assert.equal(plot.datasetCredit, credit, `${plot.id}: exact scoped image credit`);
      delete plot.datasetCredit;
    }
    for (const point of plot.points) if (ids.has(point.id)) {
      const original = points.find(p => p.id === point.id);
      assert.ok(original, point.id);
      point.sourceTitle = original.sourceTitle;
      point.sourceUrl = original.sourceUrl;
      delete point.sourceRole;
      delete point.supportingReferences;
      if (restoreRawNotes) point.note = original.note;
    }
  }
  return restored;
}
