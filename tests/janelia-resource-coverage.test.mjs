import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const evidence = JSON.parse(readFileSync(new URL('../src/data/draft-chart-evidence.json', import.meta.url), 'utf8'))['Open-access connectomics data over time'];
test('public resource coverage names MaleCNS and Fish Fire&Wire without inventing byte observations', () => {
  assert.match(evidence.gapReason, /MaleCNS/);
  assert.match(evidence.gapReason, /Fish Fire&Wire \(Fish2\)/);
  assert.match(evidence.gapReason, /request-only/);
  assert.match(evidence.gapReason, /December 1, 2027/);
  assert.match(evidence.gapReason, /not Fish1/);
  assert.match(evidence.gapReason, /no verified TB\/PB/);
  assert.deepEqual(evidence.plots[0].points.map(p => [p.id, p.x, p.y]), [
    ['hildebrand-zebrafish-public-images-2017', 2017, 0.0027],
    ['fafb-image-download-2018', 2018, 0.012],
    ['hemibrain-v1', 2020, 0.026],
    ['h01-2021', 2021, 1.4],
    ['microns-2025-size', 2025, 1.6],
  ]);
});
