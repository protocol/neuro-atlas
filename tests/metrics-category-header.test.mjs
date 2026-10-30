import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { MetricsSection } from '../src/components/sections/metrics-section.tsx';
globalThis.React = React;

test('category headers expose a separately wrapping name without redundant badges or counts', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MetricsSection, { performance: null, references: { recording: null } })));
  const doc = dom.window.document;
  const style = doc.createElement('style');
  style.textContent = readFileSync('src/components/draft-chart-plot.css', 'utf8');
  doc.head.append(style);
  for (const toggle of doc.querySelectorAll('[data-metric-toggle]')) {
    assert.equal(toggle.querySelector('.metric-category-name')?.textContent, toggle.dataset.metricToggle,
      'The name must wrap independently from the disclosure icon');
    assert.doesNotMatch(toggle.textContent, /gaps|placeholder|1 charts/);
    const layout = dom.window.getComputedStyle(toggle);
    assert.equal(layout.display, 'grid');
    assert.match(layout.gridTemplateColumns, /^auto minmax\(0, 1fr\)/);
    assert.equal(layout.alignItems, 'baseline');
  }
  assert.equal(doc.querySelectorAll('[data-metric-toggle] small').length, 0);
  assert.equal(doc.querySelector('[data-metric-more="Mapping Scale"]').textContent, 'Show all 6 charts');
  assert.equal(doc.querySelector('[data-metric-more="Human interfaces and recordings"]').textContent, 'Show all 2 charts');
  dom.window.close();
});
