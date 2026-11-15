import test from 'node:test';
import assert from 'node:assert/strict';
import { fitLogLinear } from '../src/lib/log-linear-fit.ts';

const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);

test('fits an exponential in log10 y with an unconstrained intercept', () => {
  const fit = fitLogLinear([{ x: 2000, y: 2 }, { x: 2005, y: 20 }, { x: 2010, y: 200 }]);
  assert.equal(fit.n, 3);
  assert.equal(fit.xOrigin, 2000);
  near(fit.interceptLog10, Math.log10(2));
  near(fit.slopeLog10PerX, .2);
  near(fit.rSquaredLog10, 1);
  near(fit.points[0].y, 2);
  near(fit.points[1].y, 200, 1e-10);
  assert.deepEqual(fit.points.map(p => p.x), [2000, 2010]);
});

test('all repeated-year observations contribute equally and input order is immaterial', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 10 }, { x: 1, y: 100 }, { x: 2, y: 100 }];
  const before = JSON.stringify(points);
  const fit = fitLogLinear(points);
  near(fit.interceptLog10, .25);
  near(fit.slopeLog10PerX, 1);
  near(fit.rSquaredLog10, 8 / 11);
  assert.equal(fit.n, 4);
  assert.deepEqual(fitLogLinear([...points].reverse()), fit);
  assert.equal(JSON.stringify(points), before);
});

test('constant positive outputs have zero slope and undefined R squared', () => {
  const fit = fitLogLinear([{ x: 2000, y: 4 }, { x: 2025, y: 4 }]);
  near(fit.slopeLog10PerX, 0);
  assert.equal(fit.rSquaredLog10, null);
  near(fit.points[0].y, 4);
  near(fit.points[1].y, 4);
});

test('rejects insufficient, nonfinite, nonpositive and zero-span inputs rather than silently dropping them', () => {
  for (const points of [[], [{ x: 0, y: 1 }], [{ x: 1, y: 1 }, { x: 1, y: 2 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 0, y: -1 }, { x: 1, y: 1 }], [{ x: NaN, y: 1 }, { x: 1, y: 1 }], [{ x: 0, y: Infinity }, { x: 1, y: 1 }]]) {
    assert.throws(() => fitLogLinear(points));
  }
});
