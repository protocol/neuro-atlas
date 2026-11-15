import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const dataUrl = new URL('../src/data/bci-bitrate.source.json', import.meta.url);
test('the reconstruction keeps a reviewable photo-digitization source ledger', () => {
  assert.ok(existsSync(dataUrl), 'Missing source ledger for the requested reconstructed chart');
  const source = JSON.parse(readFileSync(dataUrl, 'utf8'));
  assert.equal(source.valueBasis, 'visual-digitization');
  assert.equal(source.observations.length, 14);
  assert.equal(source.observations.filter(point => point.identityStatus === 'unresolved').length, 4);
  assert.match(source.limitations, /original.*(dataset|spreadsheet|table).*unavailable/i);
  for (const point of source.observations) {
    assert.ok(Number.isFinite(point.slideYear) && Number.isFinite(point.approximateBps) && point.approximateBps > 0);
    assert.equal(point.qualifier, '≈');
    assert.equal(point.valueBasis, 'visual-digitization');
    assert.equal(point.pixelCenter.length, 2);
    const [x, y] = point.pixelCenter;
    const h = source.digitization.homography;
    const w = h[2][0] * x + h[2][1] * y + h[2][2];
    const year = source.digitization.homographyXOriginYear + (h[0][0] * x + h[0][1] * y + h[0][2]) / w;
    const bps = 10 ** ((h[1][0] * x + h[1][1] * y + h[1][2]) / w);
    assert.equal(point.slideYear, Math.round(year), point.id);
    assert.equal(point.approximateBps, Number(bps.toPrecision(2)), point.id);
    if (point.identityStatus === 'unresolved') assert.equal(point.nativeSource, undefined, 'No invented attribution for an anonymous slide mark');
  }
});

test('rendered selections keep the original photograph ledger separate and make evidence explicit', async () => {
  const imported = await import('../src/data/bci-bitrate.ts');
  const data = imported.default ?? imported;
  const source = JSON.parse(readFileSync(dataUrl, 'utf8'));
  const plot = data.BCI_BITRATE_EVIDENCE.plots[0];
  assert.equal(plot.points.length, 14);
  assert.match(plot.observationBasis, /Paper-reported.*calculated.*company.*image estimate/);
  assert.match(plot.scope, /14 reference observations/);
  assert.match(plot.seriesNote, /assumptions/);
  assert.equal(plot.connections, undefined);
  assert.deepEqual(plot.points.map(point => [point.id, point.x]), source.observations.map(point => [point.id, point.slideYear]));
  assert.deepEqual(plot.points.map(point => point.y), data.BCI_BITRATE_ROWS.map(row => row.bps));
  assert.deepEqual(plot.points.filter(point => !point.sourceUrl).map(point => point.id), source.observations.filter(point => point.identityStatus === 'unresolved').map(point => point.id));
  for (const point of plot.points) {
    const row = data.BCI_BITRATE_ROWS.find(row => row.id === point.id);
    assert.ok(point.note.includes(row.basisLabel));
    assert.ok(point.annotation.includes(row.basisLabel));
  }
  assert.match(plot.points.find(point => point.id.endsWith('pandarinath')).note, /4\.16/);
  assert.match(plot.points.find(point => point.id.endsWith('card-2024')).note, /31\.6/);
  assert.match(plot.points.find(point => point.id.endsWith('card-home')).note, /2026/);
});
