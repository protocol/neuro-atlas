import assert from 'node:assert/strict';
import test from 'node:test';
import { exploreFit } from '../src/lib/exploration-fit.ts';

const rows = values => values.map((y, i) => ({ id: String(i), x: 2020 + i, y }));
const fit = values => exploreFit(rows(values), 'only track', 'blue');

test('flat, falling, sparse, nonpositive and same-year data have no continuation', () => {
  for (const values of [[4,4,4], [9,4,1], [5], [1,2], [0,2,4], [-1,2,4], [1,2,Infinity]]) assert.equal(fit(values), null);
  assert.equal(exploreFit(rows([1,2,4]).map(row => ({ ...row, x: 2020 })), 'same year', 'blue'), null);
});

test('continuation predicts the historic model without inventing a crossing', () => {
  const model = fit([1, 2, 4]);
  assert.deepEqual(model.window, [2020, 2022]);
  assert.equal(model.n, 3);
  assert.equal(model.end, 2032);
  assert.equal(model.last.toPrecision(9), '4096.00000');
  assert.equal(model.rSquaredLog10, 1);
  assert.equal('crossing' in model, false);
});
