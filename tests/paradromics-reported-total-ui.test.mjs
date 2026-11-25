import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { FundingIndexDashboard } from '../src/components/funding-index-dashboard.tsx';
import { FundingSourceContext } from '../src/components/funding-source-context.tsx';
import { fundingRecordsForSource } from '../src/lib/source-context-records.ts';
import { sourceContextsForUrl } from '../src/lib/source-context.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const data = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/paradromics-reported-total-20261124.json', import.meta.url)));
const total = fixture.reportedTotals[0];
const timelineRow = () => document.querySelector('[data-funding-company-identity="paradromics"]').closest('button');
const stageRow = () => [...document.querySelectorAll('button')].find(e => e.textContent.includes('Paradromics'));

const assertAnnotation = row => {
  const annotation = row.querySelector('[data-reported-company-total]');
  assert.ok(annotation, 'company self-report is visibly available alongside indexed capital');
  for (const text of ['$180M company-reported total', 'Includes federal funding', 'Reported Nov 18, 2026', 'Source in detail']) {
    assert.equal(annotation.textContent.includes(text), true, text);
  }
  assert.equal(annotation.title, total.sourceUrl);
};

test('company detail prominently presents the public $180M total beside itemized financing with scope, date, and source', async () => {
  const cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  try {
    await click(timelineRow());
    const dialog = document.querySelector('[role="dialog"]');
    const primary = dialog.querySelector('.text-4xl');
    assert.equal(primary.textContent, '$180M', 'company-reported total is the prominent detail metric');
    assert.equal(primary.parentElement.textContent.includes('Company-reported total'), true);
    assert.equal(dialog.textContent.includes('Includes federal funding'), true);
    assert.equal(dialog.textContent.includes('Reported Nov 18, 2026'), true);
    const citation = [...dialog.querySelectorAll('a')].find(a => a.href === total.sourceUrl);
    assert.ok(citation, 'the exact timestamped public interview is linked');
    assert.equal(dialog.textContent.includes('Indexed financing · $85.4M'), true);
    assert.equal(dialog.textContent.includes('Public company self-report'), true);
    const notes = [...dialog.querySelectorAll('details')].find(e => e.textContent.includes(total.note));
    assert.ok(notes, 'full methodology stays in a native collapsed source disclosure');
    assert.equal(notes.open, false);
    assert.equal(notes.querySelector('summary').textContent, 'Source notes');
    assert.equal(primary.parentElement.textContent.includes(total.note), false, 'primary metric stays brief');
    const indexed = dialog.querySelector('[data-indexed-financing-summary]');
    assert.ok(indexed);
    assert.equal(indexed.textContent.includes('$85.4M'), true);
    assert.equal(indexed.textContent.includes('1 financing record excluded from indexed financing'), true);
    const financingHistory = [...dialog.querySelectorAll('section')].find(section => section.querySelector('h3')?.textContent === 'Financing history');
    assert.equal(financingHistory.querySelectorAll('article').length, 4, 'no synthetic financing record');
  } finally { await cleanup(); }
});

test('timeline and stage retain indexed capital columns and bars while showing a distinct public-total annotation', async () => {
  let cleanup = await mount(React.createElement(FundingIndexDashboard, { data }));
  let reportedBarWidth;
  try {
    assert.equal(document.body.textContent.includes('Indexed financing'), true);
    const timeline = timelineRow();
    assert.equal(timeline.lastElementChild.firstElementChild.textContent, '$85.4M', 'Indexed financing header matches its column');
    assertAnnotation(timeline);
    assert.equal(timeline.querySelectorAll('[data-reported-company-total]').length, 1, 'one Paradromics annotation, independent of other company reports');
    await click([...document.querySelectorAll('button')].find(e => e.textContent === 'stage'));
    const stage = stageRow();
    assertAnnotation(stage);
    assert.equal(stage.textContent.includes('$85.4M'), true);
    reportedBarWidth = stage.querySelector('.bg-accent[style]').style.width;
    await click(stage);
    assert.equal(document.querySelector('[role="dialog"] .text-4xl').textContent, '$180M');
  } finally { await cleanup(); }
  assert.deepEqual(data.reportedTotals.filter(report => report.companySlug === 'paradromics'), fixture.reportedTotals, 'the exact reviewed Paradromics report remains unchanged');
  const withoutParadromicsReport = { ...data, reportedTotals: data.reportedTotals.filter(report => report.companySlug !== 'paradromics') };
  cleanup = await mount(React.createElement(FundingIndexDashboard, { data: withoutParadromicsReport }));
  try {
    assert.equal(timelineRow().querySelectorAll('[data-reported-company-total]').length, 0, 'only the Paradromics annotation is removed');
    await click([...document.querySelectorAll('button')].find(e => e.textContent === 'stage'));
    const stage = stageRow();
    assert.equal(stage.querySelector('.bg-accent[style]').style.width, reportedBarWidth, 'reported total never changes the indexed-capital bar');
    await click(stage);
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.querySelector('.text-4xl').textContent, '$85.4M', 'legacy records keep their existing primary metric');
    assert.equal(dialog.textContent.includes('Company-reported total'), false);
  } finally { await cleanup(); }
});

test('the exact interview source resolves only its public company-total evidence in the mounted source context', async () => {
  const matches = fundingRecordsForSource(total.sourceUrl);
  assert.equal(matches.length, 1, 'public interview has an exact funding-context match');
  assert.equal(matches[0].company.slug, 'paradromics');
  assert.deepEqual(matches[0].reportedTotals, [total]);
  assert.deepEqual(matches[0].rounds, [], 'the interview is not financing-round evidence');
  const contexts = sourceContextsForUrl(total.sourceUrl);
  assert.ok(contexts.some(c => c.href === `/funding?source=${encodeURIComponent(total.sourceUrl)}#source-context`));
  assert.deepEqual(fundingRecordsForSource('https://www.youtube.com/watch?v=unrelated&t=2587s'), []);
  const cleanup = await mount(React.createElement(FundingSourceContext, { source: total.sourceUrl }));
  try {
    const context = document.querySelector('#source-context');
    assert.ok(context);
    for (const text of ['Paradromics', 'Company-reported total', '$180M', 'Includes federal funding', 'Reported Nov 18, 2026', total.note]) {
      assert.equal(context.textContent.includes(text), true, text);
    }
    assert.equal(context.querySelector('a').href, total.sourceUrl);
    assert.equal(context.querySelector('time').dateTime, total.reportedOn);
    assert.equal(context.textContent.includes('Financing record · '), false);
  } finally { await cleanup(); }
});
