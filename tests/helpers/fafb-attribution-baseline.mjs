import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { reverseFafbAttribution } from './connectomics-provenance-baseline.mjs';

// Exact public evidence bytes from 0f2045b102828b2d6bf6a7ce5d3756c379647d44.
// Keep the historical raw/scientific goldens; permit only the approved attribution delta.
export const preAttributionBytes = gunzipSync(readFileSync(new URL('../fixtures/fafb-pre-attribution-evidence.json.gz', import.meta.url)));
export const preAttributionEvidence = JSON.parse(preAttributionBytes);

export function beforeFafbAttribution(evidence, restoreRawNotes = false) {
  return reverseFafbAttribution(evidence, restoreRawNotes ? 'canonical' : 'projected');
}
