import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
test('Notables 63 keeps Science leadership and Neuracle disclosed sales in the commercial lane only', () => {
  const science = milestones.filter(row => row.slug === 'science-corp' && row.date === '2026-09-17');
  assert.equal(science.length, 1);
  assert.equal(science[0].activity, 'leadership');
  assert.match(science[0].note, /Darius Shahida/);
  assert.equal(science[0].sourceUrl, 'https://science.xyz/news/leadership-shahida/');
  const neuracle = milestones.filter(row => row.slug === 'neuracle' && row.date === '2026-09-01');
  assert.equal(neuracle.length, 1);
  assert.equal(neuracle[0].activity, 'sales');
  assert.match(neuracle[0].note, /13 .*sold/);
  assert.match(neuracle[0].note, /8 implanted/);
  assert.match(neuracle[0].note, /disclosure/);
  assert.equal(neuracle[0].sourceUrl, 'https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_9IJE.pdf#page=137');
  for (const row of [...science, ...neuracle]) {
    assert.equal(row.stage, 'commercial');
    assert.equal(row.amountUsdM, null);
    assert.equal(row.datePrecision, row.slug === 'neuracle' ? 'month' : 'day');
    assert.equal(row.scope, 'bci');
    assert.equal(funding.rounds.filter(round => round.announcedOn === row.date && ['science-corporation','neuracle-technology'].includes(round.companySlug)).length, 0);
  }
});

const funding = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));

test('Notables 63 adds the dated Neurosoft–Mila partnership without inventing funding or clinical approval', () => {
  const rows = milestones.filter(row => row.slug === 'neurosoft-bioelectronics' && row.date === '2026-09-24');
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.activity, 'partner');
  assert.equal(row.stage, 'commercial');
  assert.equal(row.datePrecision, 'day');
  assert.equal(row.scope, 'bci');
  assert.equal(row.amountUsdM, null);
  assert.equal(row.sourceUrl, 'https://mila.quebec/en/news/neurosoft-bioelectronics-partners-with-mila-to-advance-ai-powered-brain-computer-interfaces');
  assert.match(row.note, /Mila/);
  assert.match(row.note, /cortical foundation model/);
  assert.equal(milestones.filter(row => row.slug === 'precision-neuroscience' && row.date === '2026-09-24' && row.stage === 'capital').length, 1);
  assert.equal(funding.rounds.filter(row => row.companySlug === 'precision-neuroscience' && row.announcedOn === '2026-09-24').length, 1);
});
