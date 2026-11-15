import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as imported from '../src/data/bci-bitrate.ts';
const { BCI_BITRATE_EVIDENCE, BCI_BITRATE_FIT } = imported.default ?? imported;
const trend = BCI_BITRATE_EVIDENCE.plots[0].referenceTrendline;
test('the visible and exported fitted-line key discloses log-space R² for the plotted observations', () => {
  assert.ok(trend.label.includes(`R²(log10) = ${BCI_BITRATE_FIT.rSquaredLog10.toFixed(3)}`), "Visible line key must disclose R²");
  assert.ok(trend.label.includes('14 mixed-evidence points'));
  assert.ok(trend.note.includes(`R² in log10 space = ${BCI_BITRATE_FIT.rSquaredLog10.toFixed(6)}`));
  assert.match(trend.note, /equal.weight/i);
  assert.match(trend.note, /ordinary least squares/i);
});
test('the dependency-free reconstruction replays the exact CSV inputs and current fit', () => {
  const result = JSON.parse(execFileSync('python3', ['docs/bci-study-data/reproduce_fit.py'], { cwd: new URL('..', import.meta.url), encoding:'utf8' }));
  const plot = BCI_BITRATE_EVIDENCE.plots[0];
  assert.deepEqual(result.observations.map(p => [p.id,p.year,p.bps]).sort(), plot.points.map(p => [p.id,p.x,p.y]).sort());
  for (const key of ['n','xOrigin','interceptLog10','slopeLog10PerX','rSquaredLog10']) assert.ok(Math.abs(result.fit[key] - BCI_BITRATE_FIT[key]) < 1e-12, key);
});
