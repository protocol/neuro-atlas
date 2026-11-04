import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { VelocityInstrumentsSection } from '../src/components/sections/velocity-instruments-section.tsx';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPerformance, selectPace } from '../src/lib/field-velocity/performance.ts';

// Legacy Atlas components use Next's automatic JSX runtime.
globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
const css = readFileSync('src/components/performance-curves.css', 'utf8');
function metricsDocument() {
  const performance = React.createElement(React.Fragment, null,
    React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }),
    React.createElement(PaceReadings, { data: selectPace(feed) }));
  return new JSDOM(renderToStaticMarkup(React.createElement(VelocityInstrumentsSection, { performance })));
}

test('commitments renders sourced participant observations over time without an unwired Markets section', () => {
  const dom = metricsDocument();
  try {
    const doc = dom.window.document;
    assert.deepEqual([...doc.querySelectorAll('.pc-section-header h2')].map(h => h.textContent), [
      'Performance curves', 'Citation latency & latency compression',
    ]);
    for (const id of ['revealed_commitments']) {
      const section = doc.querySelector(`[data-performance-card="${id}"]`);
      assert.ok(section, `${id} must retain its modal/deep-link identity`);
      assert.equal(doc.querySelectorAll(`[data-performance-card="${id}"]`).length, 1);
      assert.ok(doc.querySelector(`[data-performance-card="${id}"] .pc-preview svg`));
    }
    assert.match(doc.querySelector('[data-performance-card="revealed_commitments"]').textContent, /Implanted BCI participants over time/);
    assert.match(doc.querySelector('[data-performance-card="revealed_commitments"]').textContent, /15 dated checkpoints/);
    assert.equal(doc.getElementById('markets'), null);
  } finally { dom.window.close(); }
});

test('channel-count frontier is only a noninteractive coming-soon chart in the Performance grid', () => {
  const dom = metricsDocument();
  try {
    const doc = dom.window.document;
    const placeholder = doc.querySelector('[data-coming-soon="channel-count-frontier"]');
    assert.ok(placeholder, 'Missing channel-count placeholder card');
    assert.equal(placeholder.closest('section').id, 'performance_curves');
    assert.equal(placeholder.parentElement.className, 'pc-grid');
    assert.equal(placeholder.parentElement.children.length, 4, 'Fourth card wraps to a new desktop row');
    assert.match(placeholder.textContent, /Channel count frontier/);
    assert.match(placeholder.textContent, /Coming soon/);
    assert.match(placeholder.textContent, /human/);
    assert.match(placeholder.textContent, /not.*neurons/i);
    assert.ok(placeholder.querySelector('.pc-placeholder-preview svg[aria-hidden="true"]'));
    assert.ok(placeholder.querySelector('.pc-coming-soon-label'));
    assert.equal(placeholder.querySelectorAll('a, button, [tabindex], [data-curve-point], [data-source-observation]').length, 0);
    assert.equal(doc.querySelectorAll('[data-coming-soon="channel-count-frontier"]').length, 1);
    assert.doesNotMatch(doc.body.textContent, /The Channel-Count Frontier|Visually it's the single most compelling/);
    assert.equal(doc.querySelectorAll('[data-performance-card]').length, 6, 'The participant time plot is now the sixth sourced shareable chart');
    assert.match(css, /\.pc-placeholder-preview svg\s*\{[^}]*filter:\s*blur\(/);
    assert.match(css, /\.pc-coming-soon-label\s*\{[^}]*position:\s*absolute/);
  } finally { dom.window.close(); }
});

test('every desktop Metrics grid reserves three tracks even with one, two or more than three cards', () => {
  const dom = metricsDocument();
  try {
    const style = dom.window.document.createElement('style');
    style.textContent = css;
    dom.window.document.head.append(style);
    const grids = [...dom.window.document.querySelectorAll('.pc-grid')];
    assert.equal(grids.length, 3);
    for (const grid of grids) {
      assert.equal(dom.window.getComputedStyle(grid).gridTemplateColumns, 'repeat(3, minmax(0, 1fr))');
      for (const card of grid.children) {
        assert.ok(['', 'auto'].includes(dom.window.getComputedStyle(card).gridColumn), 'Cards must not span spare tracks');
      }
    }
    // The same fixed track rule also governs later rows; no auto-fit/auto-fill or count-specific expansion.
    const gridRules = [...style.sheet.cssRules].filter(rule => rule.selectorText?.includes('.pc-grid'));
    assert.equal(gridRules.length, 1);
    assert.doesNotMatch(css, /auto-fit|auto-fill|\.pc-pace-grid\s*\{/);
    const mobile = [...style.sheet.cssRules].find(rule => rule.conditionText === '(max-width: 900px)');
    assert.equal([...mobile.cssRules].find(rule => rule.selectorText === '.pc-grid').style.getPropertyValue('grid-template-columns'), '1fr');
  } finally { dom.window.close(); }
});
