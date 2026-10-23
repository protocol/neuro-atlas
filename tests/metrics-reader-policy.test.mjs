import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { VelocityInstrumentsSection } from '../src/components/sections/velocity-instruments-section.tsx';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('category summaries describe displayed measurements rather than backlog proposals', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const summaries = [...dom.window.document.querySelectorAll('.metric-category-summary')].map(node => node.textContent).join(' ');
    assert.doesNotMatch(summaries, /preservation|molecular labels|\breuse\b|simulation counts|mapping economics/i);
  } finally { dom.window.close(); }
});

test('curated chart context is preserved verbatim in closed definition details, not unfinished notices', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const doc = dom.window.document;
    for (const card of doc.querySelectorAll('[data-draft-chart-card]')) {
      const evidence = DRAFT_CHART_EVIDENCE[card.dataset.draftChartCard];
      assert.equal(card.querySelector('.draft-chart-summary').textContent, evidence.summary, 'Keep essential scope beside the plotted readings');
      if (evidence.gapReason) {
        const details = card.querySelector('details[data-draft-methodology]:not([open])');
        assert.ok(details.textContent.includes(evidence.gapReason), `${card.dataset.draftChartCard}: context must be disclosed without losing wording`);
      }
      assert.equal(card.querySelectorAll(':scope > [data-draft-still-missing]').length, 0);
      assert.equal(card.textContent.includes('Still missing:'), false);
    }
  } finally { dom.window.close(); }
});

test('the actual Field velocity page contains readings, not Markets or channel-count placeholders', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-coming-soon], #markets').length, 0);
    assert.equal(doc.querySelectorAll('[data-performance-card]').length, 5, 'Three reference views and two pace cards');
    assert.equal(doc.querySelectorAll('[data-trends-card]').length, 2);
    assert.equal(doc.querySelectorAll('[data-draft-chart-card]').length, 14);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 85);
    assert.ok(doc.querySelector('#metric-category-0 [data-performance-card="tissue-mapped"]'));
    assert.ok(doc.querySelector('#metric-category-3 [data-performance-card="neural-recording-hours"]'));
    assert.ok(doc.querySelector('#metric-category-3 [data-performance-card="simultaneously-recorded-neurons"]'));
    assert.ok(doc.querySelector('#metric-category-6 #revealed_commitments'));
    const surface = doc.querySelector('.metrics-index').cloneNode(true);
    surface.querySelectorAll('details').forEach(node => node.remove());
    assert.equal(/Channel count frontier|not yet wired|unwired|evidence gaps|no year-by-year series wired yet|\bmarkets\b/i.test(surface.textContent), false);
  } finally { dom.window.close(); }
});

test('commitments uses the validated shared cohort, scope and observation date', () => {
  const record = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')).records.find(row => row.instrument === 'revealed_commitments');
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(VelocityInstrumentsSection, { performance: null })));
  try {
    const card = dom.window.document.getElementById('revealed_commitments');
    assert.ok(card.textContent.includes(record.metric), 'Use the shared implantable-BCI cohort definition');
    assert.ok(card.textContent.includes(record.value), '67 participants through December 2023');
    const details = card.querySelector('details:not([open])');
    assert.ok(details?.textContent.includes(record.trend), 'Full original scope remains in the disclosure');
    assert.match(card.textContent, /endovascular.*ECoG/);
    assert.match(card.textContent, /not.*active installed base/);
    assert.doesNotMatch(card.textContent, /Enrolment is now accelerating|1998–2024|through 2024|Cumulative humans implanted with an intracortical/);
  } finally { dom.window.close(); }
});
