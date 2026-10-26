import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const scienceLeadershipSource = 'https://science.xyz/news/leadership-shahida/';

test('Notables 63 excludes Science’s routine president appointment from canonical and generated milestones', () => {
  const science = milestones.filter(row => row.slug === 'science-corp' && row.date === '2026-09-17' && row.activity === 'leadership');
  assert.equal(science.length, 0, 'Routine executive appointments do not qualify as notable milestones');
  assert.equal(milestones.some(row => row.sourceUrl === scienceLeadershipSource), false);
  const canonical = readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8');
  assert.doesNotMatch(canonical, /^Science Corp,science-corp,leadership,commercial,,2026-09-17,/m);
  assert.equal(canonical.includes(scienceLeadershipSource), false);
});

test('Notables 63 keeps Neuracle disclosed sales in the commercial lane only', () => {
  const neuracle = milestones.filter(row => row.slug === 'neuracle' && row.date === '2026-09-29');
  assert.equal(neuracle.length, 1);
  assert.equal(neuracle[0].activity, 'sales');
  assert.match(neuracle[0].note, /13 .*sold/);
  assert.match(neuracle[0].note, /8 implanted/);
  assert.match(neuracle[0].note, /disclosure/);
  assert.equal(neuracle[0].sourceUrl, 'https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_9IJE.pdf#page=137');
  for (const row of neuracle) {
    assert.equal(row.stage, 'commercial');
    assert.equal(row.amountUsdM, null);
    assert.equal(row.datePrecision, 'day');
    assert.equal(row.scope, 'bci');
    assert.equal(funding.rounds.filter(round => round.announcedOn === row.date && ['science-corporation','neuracle-technology'].includes(round.companySlug)).length, 0);
  }
});

const funding = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));

test('Notables 63 rendered timeline omits Science leadership and retains Neuracle sales and Neurosoft partnership', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const document = dom.window.document;
    const timeline = document.querySelector('[aria-label="2026 timeline. Scroll horizontally for later months."]');
    assert.ok(timeline);
    assert.equal(document.querySelectorAll(`a[href="${scienceLeadershipSource}"]`).length, 0);
    assert.equal(document.querySelectorAll('[aria-label="Science Corp — leadership"]').length, 0);
    for (const [slug, date, label] of [
      ['neuracle', '2026-09-29', 'Neuracle — sales'],
      ['neurosoft-bioelectronics', '2026-09-24', 'Neurosoft Bioelectronics — partner'],
    ]) {
      const row = milestones.find(row => row.slug === slug && row.date === date);
      assert.ok(row);
      const links = timeline.querySelectorAll(`a[href="${row.sourceUrl}"]`);
      assert.equal(links.length, 1);
      assert.equal(links[0].getAttribute('aria-label'), label);
    }
  } finally {
    dom.window.close();
  }
});

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
