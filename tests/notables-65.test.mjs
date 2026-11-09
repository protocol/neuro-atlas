import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { parseCsv } from '../scripts/lib/funding-index.mjs';

const load = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const fixture = load('./fixtures/notables-65.json');
const milestones = load('../src/data/milestones.json');
const funding = load('../src/data/funding-index.json');
const canonical = parseCsv(readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8'));
const sources = fixture.milestones.map(row => row.sourceUrl);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const one = source => {
  const rows = milestones.filter(row => row.sourceUrl === source);
  assert.equal(rows.length, 1, source);
  return rows[0];
};

test('Notables 65 adds only six reviewed source-bound milestones; all pre-65 generated events are unchanged', () => {
  assert.equal(sources.length, 6);
  assert.equal(new Set(sources).size, 6);
  assert.equal(milestones.length, 90);
  assert.equal(digest(milestones.filter(row => !sources.includes(row.sourceUrl))), fixture.baselineMilestonesSha256);
  for (const expected of fixture.milestones) {
    const row = one(expected.sourceUrl);
    for (const key of Object.keys(expected)) assert.deepEqual(row[key], expected[key], key);
    assert.equal(row.datePrecision, 'day');
    assert.equal(row.scope, 'bci');
    const raw = canonical.filter(r => r.source_url === expected.sourceUrl);
    assert.equal(raw.length, 1);
    assert.equal(row.note, raw[0].note);
    assert.equal(row.date, raw[0].date);
    assert.equal(row.amountUsdM, raw[0].amount_usd_m ? Number(raw[0].amount_usd_m) : null);
  }
});

test('Notables 65 adds Coherence Series A once in the Funding index, without USD conversion or regulatory inflation', () => {
  const source = fixture.milestones.find(row => row.company === 'Coherence Neuro').sourceUrl;
  const rounds = funding.rounds.filter(round => round.sourceUrl === source);
  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].amountUsdM, 45);
  assert.equal(rounds[0].companySlug, 'coherence-neuro');
  assert.equal(rounds[0].stage, 'Series A');
  assert.equal(rounds[0].announcedOn, '2026-10-21');
  assert.equal(rounds[0].sourceKind, 'primary');
  assert.equal(rounds[0].reviewedOn, '2026-11-09');
  assert.equal(digest(funding.rounds.filter(round => round.sourceUrl !== source)), fixture.baselineFundingRoundsSha256);
  assert.equal(digest(funding.milestones), fixture.baselineRegulatorySha256);
  const nx = one(fixture.milestones.find(row => row.company === 'NeuroXess').sourceUrl);
  assert.equal(nx.amountUsdM, null);
  assert.match(nx.note, /RMB 700m/);
  assert.match(nx.note, /Excluded from USD capital totals/);
  assert.equal(funding.rounds.some(round => round.sourceUrl === nx.sourceUrl), false);
  assert.equal(funding.summary.asOf, fixture.baselineSummary.asOf);
  assert.equal(funding.summary.indexedRounds, fixture.baselineSummary.indexedRounds + 1);
  assert.equal(funding.summary.observedCapitalUsdM, Number((fixture.baselineSummary.observedCapitalUsdM + 45).toFixed(2)));
});

test('Notables 65 corrects only the existing Coherence indication and keeps the company roster unchanged', () => {
  assert.equal(funding.companies.length, 25);
  const companies = structuredClone(funding.companies);
  const co = companies.find(company => company.slug === 'coherence-neuro');
  assert.equal(co.indication, 'Cancer');
  co.indication = 'Neurodegenerative conditions';
  assert.equal(digest(companies), fixture.baselineCompaniesSha256);
});

test('Notables 65 dates and qualifications distinguish MOU signing, IDE amendment and single-participant research', () => {
  const precision = one(fixture.milestones.find(row => row.company === 'Precision Neuroscience').sourceUrl);
  assert.equal(precision.date, '2026-10-21');
  assert.match(precision.note, /announcement Oct 29/);
  const amendment = one(fixture.milestones.find(row => row.company === 'Paradromics' && row.activity === 'IDE').sourceUrl);
  assert.match(amendment.note, /existing IDE study, not initial IDE authorization or marketing approval/);
  const neuralink = one(fixture.milestones.find(row => row.company === 'Neuralink').sourceUrl);
  assert.match(neuralink.note, /one participant.*75 words per minute at 5.8% word error rate.*125,000-word/);
  assert.match(neuralink.note, /preliminary single-participant/);
  const provenance = readFileSync(new URL('../data/notables/notables-65.md', import.meta.url), 'utf8');
  assert.match(provenance, /StairMed.*42 long-term implants/);
  assert.match(provenance, /Omitted as primary-unavailable and ambiguous/);
  assert.match(provenance, /No implant-count chart is updated/);
  assert.match(provenance, /routine executive\/adviser appointments/i);
  for (const url of sources) assert.ok(provenance.includes(url));
});

test('All six Notables 65 events render exactly once as direct source links on the 2026 timeline', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const timeline = dom.window.document.querySelector('[aria-label="2026 timeline. Scroll horizontally for later months."]');
    assert.ok(timeline);
    for (const expected of fixture.milestones) {
      const links = timeline.querySelectorAll(`a[href="${expected.sourceUrl}"]`);
      assert.equal(links.length, 1, expected.sourceUrl);
      assert.equal(links[0].getAttribute('aria-label'), `${expected.company} — ${expected.activity}`);
    }
  } finally { dom.window.close(); }
});
