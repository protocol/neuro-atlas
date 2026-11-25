import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
const canonical = file => parseCsv(readFileSync(new URL('../data/' + file, import.meta.url), 'utf8'));

test('Penumbra remains an acquisition agreement at enterprise value, not a completed acquisition or financing', () => {
  const rows = canonical('market-memo-q1-2026/milestones.csv').filter(r => r.company === 'Penumbra');
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.stage, 'commercial');
  assert.equal(row.activity, '$14.5b EV');
  assert.equal(row.amount_usd_m, '14500');
  assert.match(row.note, /agreement to acquire/i);
  assert.match(row.note, /The plotted value covers the acquisition agreement\./i);
  assert.doesNotMatch(row.note, /memo author|neural-access bet/);
});


test('NeuroBionics distinguishes its endovascular clinical device from research fibers', () => {
  const row = canonical('funding-index/companies.csv').find(r => r.slug === 'neurobionics');
  assert.equal(row.interface_depth, 'Endovascular (clinical device)');
  assert.match(row.indication, /clinical development/);
  assert.match(row.indication, /research/);
  assert.doesNotMatch(row.interface_depth, /Intracortical/);
});
