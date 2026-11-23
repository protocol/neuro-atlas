import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { parseCsv } from '../scripts/lib/funding-index.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const load = path => JSON.parse(read(path));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fixture = load('./fixtures/notables-66.json');
const milestones = load('../src/data/milestones.json');
const funding = load('../src/data/funding-index.json');
const sources = fixture.sources;
const one = source => {
  const rows = milestones.filter(row => row.sourceUrl === source);
  assert.equal(rows.length, 1, source);
  return rows[0];
};

test('Notables 66 is exactly three source-bound additions; every prior timeline record is unchanged', () => {
  assert.equal(sources.length, 3);
  assert.equal(hash(milestones.filter(row => !sources.includes(row.sourceUrl))), fixture.baselineMilestonesSha256);
  const canonical = parseCsv(read('../data/market-memo-q1-2026/milestones.csv'));
  assert.equal(hash(canonical.filter(row => !sources.includes(row.source_url))), fixture.baselineCanonicalMilestonesSha256);
  for (const expected of fixture.expectedMilestones) {
    assert.deepEqual(canonical.filter(row => row.source_url === expected.source_url), [expected]);
    const actual = one(expected.source_url);
    for (const [derived, raw] of Object.entries({ company:'company', activity:'activity', stage:'stage', date:'date', datePrecision:'date_precision', dateBasis:'date_basis', note:'note', scope:'scope' })) {
      assert.equal(actual[derived], expected[raw], derived);
    }
  }
});

test('Notables 66 retains the entire Funding index and coverage contract; only timeline gets the grant', () => {
  assert.equal(funding.rounds.filter(row => sources.includes(row.sourceUrl)).length, 0);
  assert.equal(hash(funding.rounds), fixture.baselineRoundsSha256);
  assert.equal(hash(Object.fromEntries(Object.entries(funding).filter(([key]) => !['rounds','summary','investors'].includes(key)))), fixture.baselineFundingWithoutRoundsAndSummarySha256);
  assert.equal(hash(funding.investors), fixture.baselineInvestorsSha256);
  assert.deepEqual(funding.summary, fixture.baselineSummary);
  assert.match(funding.methodology.coverage, /standalone grants and lifetime cumulative totals are not added/);
  const grant = one(sources[0]);
  assert.equal(grant.activity, 'grant');
  assert.equal(grant.amountUsdM, 4.6 / (1 / 1.3483));
  assert.equal(grant.fx.nativePerUsd, 1 / 1.3483);
  assert.equal(grant.fx.rateDate, '2026-11-05');
  assert.equal(grant.fx.investmentDate, null);
  assert.equal(grant.fx.dateBasis, 'announcement_date');
  assert.equal(grant.fx.rateSourceUrl, 'https://www.federalreserve.gov/releases/h10/20261109/');
  assert.match(grant.note, /announcement-date fallback/);
  const fx = load('../data/funding-index/fx-conversions.json');
  assert.equal(hash(fx.filter(row => row.sourceUrl !== sources[0])), fixture.baselineFxSha256);
  for (const [path, digest] of Object.entries(fixture.baselineExactFiles)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'), digest);
  }
});

test('Notables 66 retains honest dates, reported setbacks, company identity and exclusions', () => {
  const synchron = one(sources[1]);
  assert.equal(synchron.date, '2026-11-12');
  assert.equal(synchron.dateBasis, 'reported');
  assert.match(synchron.note, /not FDA-directed/);
  assert.match(synchron.note, /Canada separately lists termination for insufficient recruitment/);
  const neuracle = one(sources[2]);
  assert.equal(neuracle.company, 'Neuracle');
  assert.equal(neuracle.dateBasis, 'reported');
  assert.match(neuracle.note, /Reporting-only/);
  assert.match(neuracle.note, /12 commercial implants/);
  assert.match(neuracle.note, /up to 30%/);
  assert.match(neuracle.note, /not national medical-insurance/);
  const science = milestones.filter(row => row.sourceUrl === 'https://science.xyz/news/series-d/');
  assert.equal(science.length, 1);
  assert.equal(funding.rounds.filter(row => row.sourceUrl === science[0].sourceUrl).length, 1);
  const provenance = read('../data/notables/notables-66.md');
  assert.match(provenance, /routine executive appointment/);
  assert.match(provenance, /March 16, 2023/);
  assert.match(provenance, /No implant-count chart or field-velocity metric is updated/);
  for (const source of sources) assert.ok(provenance.includes(source));
});

test('Notables 66 renders all three once in 2026 and counts the ARIA event as a grant, never financing', () => {
  globalThis.React = React;
  const before = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const timeline = before.window.document.querySelector('[aria-label^="2026 timeline."]');
    assert.ok(timeline, 'actual 2026 year must render');
    for (const source of sources) {
      const row = one(source);
      assert.equal(timeline.querySelectorAll(`a[href="${source}"]`).length, 1, source);
      assert.equal(timeline.querySelector(`a[href="${source}"]`).getAttribute('aria-label'), `${row.company} — ${row.activity}`);
    }
    const summary = [...before.window.document.querySelectorAll('aside .space-y-3 > div')]
      .find(row => [...row.querySelectorAll('span')].some(span => span.textContent === 'Capital'));
    assert.ok(summary, 'real rendered capital summary');
    const baseline = fixture.baseline2026Capital;
    assert.match(summary.textContent, new RegExp(`${baseline.financingRecords} financing records · ${baseline.awards + 1} award`));
    assert.equal(summary.querySelector('.tnum').textContent, `$${(baseline.usdM / 1000).toFixed(1)}b`, 'ARIA grant must not inflate the financing total');
  } finally { before.window.close(); }
});
