import test from 'node:test';
import assert from 'node:assert/strict';

test('historical log fit computes OLS diagnostics and confines output to the observed window', async () => {
  const mod = await import('../src/lib/historical-log-fit.ts').catch(() => ({}));
  assert.equal(typeof mod.fitHistoricalLog, 'function', 'Reusable historical OLS fit is implemented');
  const fit = mod.fitHistoricalLog([{id:'a',x:2000,y:2},{id:'b',x:2002,y:4},{id:'c',x:2004,y:8}]);
  assert.deepEqual(fit.inputIds, ['a','b','c']);
  assert.equal(fit.n, 3);
  assert.deepEqual(fit.window, [2000,2004]);
  assert.ok(Math.abs(fit.doublingYears - 2) < 1e-12);
  assert.equal(fit.rSquaredLog10, 1);
  assert.deepEqual(fit.points.map(p=>p.x), [2000,2004]);
  assert.ok(Math.abs(fit.points[1].y - 8) < 1e-12);
  assert.match(fit.equation, /log10\(y\)/);
  assert.equal(mod.fitHistoricalLog([{id:'x',x:2000,y:0},{id:'y',x:2001,y:1}]), null);
  assert.equal(mod.fitHistoricalLog([{id:'x',x:2000,y:1},{id:'y',x:2000,y:2}]), null);
  const flat = mod.fitHistoricalLog([{id:'x',x:2000,y:2},{id:'y',x:2001,y:2}]);
  assert.equal(flat.doublingYears, null);
  assert.equal(flat.rSquaredLog10, null);
});
