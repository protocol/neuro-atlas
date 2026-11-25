import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';

const canonical = parseCsv(readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8'));
const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const funding = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const one = (rows, source, key) => {
  const matches = rows.filter(row => row[key] === source);
  assert.equal(matches.length, 1, `Expected exactly one ${key} record for ${source}`);
  return matches[0];
};

function assertRecord(raw, expected) {
  const row = one(canonical, expected.sourceUrl, 'source_url');
  assert.deepEqual(row, { ...raw, capital_treatment: '' }, 'Canonical record retains every exact source value and the explicit blank treatment');
  assert.deepEqual(one(milestones, expected.sourceUrl, 'sourceUrl'), expected,
    'Generated record retains every reviewed canonical value');
  assert.equal(funding.rounds.some(round => round.sourceUrl === expected.sourceUrl), false,
    'A neuro-wide milestone does not create a BCI Funding Index financing');
}

test('EON seed announcement adds broader brain-emulation coverage without expanding the BCI Funding Index', () => {
  const source = 'https://untappedventures.substack.com/p/untapped-ventures-invests-in-eon';
  const note = 'Untapped Ventures announced participation in EON Systems\' $3.5m seed round led by Protocol Labs for brain emulation and connectomics. December 30 is the investor announcement date, not a separately verified closing date.';
  assertRecord({
    company: 'EON Systems', nf_slug: '', activity: '$3.5m', stage: 'capital', amount_usd_m: '3.5',
    date: '2025-12-30', date_precision: 'day', note, source_url: source, scope: 'broader', date_basis: 'announcement',
  }, {
    company: 'EON Systems', slug: 'eon-systems', activity: '$3.5m', stage: 'capital', amountUsdM: 3.5,
    date: '2025-12-30', datePrecision: 'day', dateBasis: 'announcement', note, sourceUrl: source, logo: null, scope: 'broader',
  });
  assert.equal(funding.companies.some(company => company.slug === 'eon-systems'), false);
});

test('Hemispheric records one aggregate disclosure without counting $52m as a dated financing round', () => {
  const source = 'https://www.calcalistech.com/ctechnews/article/rjentgbege';
  const note = 'Disclosed $52m aggregate funding across three early-stage rounds (pre-seed, seed and Series A), not one $52m round. Protocol Labs is named among investors; per-round amounts, exact dates and Protocol Labs\' specific round participation are not disclosed. July 15 is the financing-disclosure announcement date. NeuroAI based on noninvasive EEG; excluded from annual USD capital totals and the cumulative capital line.';
  assertRecord({
    company: 'Hemispheric', nf_slug: '', activity: '$52m aggregate', stage: 'capital', amount_usd_m: '',
    date: '2026-07-15', date_precision: 'day', note, source_url: source, scope: 'broader', date_basis: 'announcement',
  }, {
    company: 'Hemispheric', slug: 'hemispheric', activity: '$52m aggregate', stage: 'capital', amountUsdM: null,
    date: '2026-07-15', datePrecision: 'day', dateBasis: 'announcement', note, sourceUrl: source, logo: null, scope: 'broader',
  });
  assert.equal(milestones.filter(row => row.company === 'Hemispheric').length, 1, 'One disclosure, not three invented rounds');
  assert.equal(funding.companies.some(company => company.slug === 'hemispheric'), false);
  const annual = rows => rows.filter(row => row.stage === 'capital' && row.date?.startsWith('2026-')
    && !['grant', 'award'].includes(row.activity)).reduce((sum, row) => sum + (row.amountUsdM ?? 0), 0);
  assert.equal(annual(milestones), annual(milestones.filter(row => row.sourceUrl !== source)),
    'The aggregate disclosure adds no USD amount to annual or cumulative financing inputs');
});

test('Paradromics NEOM strategic investment stays amount-undisclosed without invented PL participation or completed facilities', () => {
  const source = 'https://paradromics.com/news/neom-investment-fund-partners-with-paradromics-to-drive-innovation-in-neurotechnology-healthcare/';
  const note = 'Announced a strategic investment from NEOM and a partnership led by NEOM Investment Fund (NIF) to advance BCI-based therapies. Financing amount and round stage are not disclosed. The agreement plans a Brain-Computer Interface Center of Excellence within NEOM; the announcement does not establish that the center is built or operational.';
  assertRecord({
    company: 'Paradromics', nf_slug: 'paradromics', activity: 'strategic investment', stage: 'capital', amount_usd_m: '',
    date: '2025-02-12', date_precision: 'day', note, source_url: source, scope: 'bci', date_basis: 'announcement',
  }, {
    company: 'Paradromics', slug: 'paradromics', activity: 'strategic investment', stage: 'capital', amountUsdM: null,
    date: '2025-02-12', datePrecision: 'day', dateBasis: 'announcement', note, sourceUrl: source, logo: '/logos/paradromics.png', scope: 'bci',
  });
  assert.equal(milestones.filter(row => row.company === 'Paradromics' && row.date === '2025-02-12').length, 1);
  assert.equal(funding.rounds.some(round => round.companySlug === 'paradromics' && round.announcedOn === '2025-02-12'), false);
});
