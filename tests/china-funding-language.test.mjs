import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';
import { CHINA_BACKFILL_EVENTS } from './helpers/china-funding-current.mjs';

test('China financing notes describe sources and dates in plain positive language', async () => {
  const data = await loadFundingIndexSources('data/funding-index');
  const rows = data.rounds.filter(row => row.currency === 'CNY' && CHINA_BACKFILL_EVENTS.some(([slug, date]) => row.company_slug === slug && row.announced_on === date));
  assert.equal(rows.length, 11);
  for (const row of rows) {
    assert.doesNotMatch(row.note, /primary.origin|issuer.hosted|\bnot\b|\bno\b|rather than|parent should|do not/i, row.company_slug);
  }
  const xinsheng = rows.find(row => row.company_slug === 'xinsheng-shijie');
  assert.match(xinsheng.note, /Matrix Partners’ investor announcement on Sina/);
  assert.match(xinsheng.note, /Waves reporting, also syndicated by Sina on June 18/);
  assert.match(xinsheng.note, /nearly RMB 100m/i);
  assert.match(xinsheng.note, /near-amount comparison anchor/);
  assert.equal(xinsheng.date_basis, 'reported', 'June 18 remains the source report date, not a claimed closing date');
  for (const row of rows.filter(row => row.company_slug === 'active-technology')) {
    assert.match(row.note, /Company announcement published on ZiDongHua/);
  }
});
