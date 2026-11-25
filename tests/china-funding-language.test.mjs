import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFundingIndexSources } from '../scripts/lib/funding-index.mjs';

test('China financing notes describe sources and dates in plain positive language', async () => {
  const data = await loadFundingIndexSources('data/funding-index');
  const rows = data.rounds.filter(row => row.reviewed_on === '2026-11-24' && row.currency === 'CNY');
  assert.equal(rows.length, 11);
  for (const row of rows) {
    assert.doesNotMatch(row.note, /primary.origin|issuer.hosted|syndicat|\bnot\b|\bno\b|rather than|parent should|do not/i, row.company_slug);
  }
  const xinsheng = rows.find(row => row.company_slug === 'xinsheng-shijie');
  assert.match(xinsheng.note, /Announcement by the investor 经纬创投, published on Sina/);
  assert.match(xinsheng.note, /nearly RMB 100m/i);
  assert.match(xinsheng.note, /Closing date: undisclosed/);
  for (const row of rows.filter(row => row.company_slug === 'active-technology')) {
    assert.match(row.note, /Company announcement published on ZiDongHua/);
  }
});
