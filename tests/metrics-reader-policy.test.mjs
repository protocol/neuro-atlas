import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { VelocityInstrumentsSection } from '../src/components/sections/velocity-instruments-section.tsx';
import { METRIC_CHART_EVIDENCE as DRAFT_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('category summaries describe displayed measurements rather than backlog proposals', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const summaries = [...dom.window.document.querySelectorAll('.metric-category-summary')].map(node => node.textContent).join(' ');
    assert.doesNotMatch(summaries, /preservation|molecular labels|\breuse\b|simulation counts|mapping economics/i);
  } finally { dom.window.close(); }
});

test('curated chart context is preserved verbatim in modal definition details, not repeated preview notices', async () => {
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-expand-metrics]'));
    for (const card of document.querySelectorAll('[data-draft-chart-card]')) {
      const evidence = DRAFT_CHART_EVIDENCE[card.dataset.draftChartCard];
      assert.equal(card.querySelector('.draft-chart-summary'), null, 'Preview avoids a repeated definition wrapper');
      assert.ok(card.querySelector('[data-metric-scope]')?.textContent.trim(), 'Essential scope stays visible');
      await click(card.querySelector('[data-draft-popout-trigger]'));
      const modal = card.querySelector('dialog[open]');
      assert.equal(modal.querySelector('.draft-chart-summary').textContent, evidence.summary, 'Full original context stays with the chart');
      if (evidence.gapReason) {
        const details = modal.querySelector('details[data-draft-methodology]:not([open])');
        assert.ok(details.textContent.includes(evidence.gapReason), `${card.dataset.draftChartCard}: context must be disclosed without losing wording`);
      }
      assert.equal(card.querySelectorAll(':scope > [data-draft-still-missing]').length, 0);
      assert.equal(card.textContent.includes('Still missing:'), false);
      await click(modal.querySelector('.pc-modal-header button'));
    }
  } finally { await cleanup(); }
});

test('the actual Field velocity page contains readings, not Markets or channel-count placeholders', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('[data-coming-soon], #markets').length, 0);
    assert.equal(doc.querySelectorAll('[data-performance-card]').length, 4, 'Unique neuron capability chart, two pace cards and participant timeline');
    assert.equal(doc.querySelectorAll('[data-trends-card]').length, 2);
    assert.equal(doc.querySelectorAll('[data-draft-chart-card]').length, 15);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length, 77);
    assert.equal(doc.querySelector('#metric-category-0 [data-performance-card="tissue-mapped"]'), null);
    assert.equal(doc.querySelector('#metric-category-3 [data-performance-card="neural-recording-hours"]'), null);
    assert.ok(doc.querySelector('#metric-category-3 [data-performance-card="simultaneously-recorded-neurons"]'));
    assert.ok(doc.querySelector('#metric-category-6 [data-performance-card="revealed_commitments"]'));
    const surface = doc.querySelector('.metrics-index').cloneNode(true);
    surface.querySelectorAll('details').forEach(node => node.remove());
    assert.equal(/Channel count frontier|not yet wired|unwired|evidence gaps|no year-by-year series wired yet|\bmarkets\b/i.test(surface.textContent), false);
  } finally { dom.window.close(); }
});

test('commitments preserves the shared cohort source inside the new dated series', async () => {
  const cleanup = await mount(React.createElement(VelocityInstrumentsSection, { performance: null }));
  try {
    const card = document.querySelector('[data-performance-card="revealed_commitments"]');
    assert.ok(card.querySelector('svg circle'), 'Show the available chronological checkpoints');
    await click(card.querySelector('.pc-trigger'));
    const modal = document.querySelector('dialog[open]');
    const review = modal.querySelector('[data-source-observation="identified-literature-cohort:2023-12-01"]');
    assert.match(review.textContent, /67 participants/);
    assert.match(review.textContent, /2023-12/);
    assert.match(review.textContent, /endovascular/);
    assert.ok(review.querySelector('a[href="https://www.nature.com/articles/s44222-024-00239-5"]'));
    assert.doesNotMatch(modal.textContent, /Enrolment is now accelerating|1998–2024|through 2024|Cumulative humans implanted with an intracortical/);
  } finally { await cleanup(); }
});
