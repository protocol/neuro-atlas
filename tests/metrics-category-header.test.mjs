import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { MetricsSection } from '../src/components/sections/metrics-section.tsx';
globalThis.React = React;

test('category headers expose a separately wrapping name and grammatical evidence counts', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MetricsSection, { performance: null, references: { mapping: null, recording: null } })));
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
  assert.match(doc.querySelector('[data-metric-toggle="Mapping scale"] small').textContent, /charts · 1 reference view/);
  assert.match(doc.querySelector('[data-metric-toggle="Human interfaces and recordings"] small').textContent, /charts · 2 reference views/);
  dom.window.close();
});
