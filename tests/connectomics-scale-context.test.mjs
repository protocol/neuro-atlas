import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {DRAFT_CHART_EVIDENCE} from '../src/data/draft-chart-observations.ts';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {DraftChartsSection} from '../src/components/sections/draft-charts-section.tsx';
import {canonicalPerformanceAnchor} from '../src/data/field-velocity-links.ts';
import {mount, click, settle} from './modal-helpers.mjs';

globalThis.React = React;
const neuronPlot = METRIC_CHART_EVIDENCE['Largest published connectome over time'].plots[0];
const bytePlot = METRIC_CHART_EVIDENCE['Open-access connectomics data over time'].plots[0];
const original = DRAFT_CHART_EVIDENCE['Largest published connectome over time'].plots[0];

test('anatomical scale references use primary neuron counts independently of connectome observations', () => {
  assert.deepEqual(neuronPlot.references?.map(reference => [reference.id, reference.y]), [
    ['mouse-whole-brain-neurons', 70_890_000],
    ['macaque-whole-brain-neurons', 6_376_160_000],
    ['human-whole-brain-neurons', 86_100_000_000],
  ]);
  assert.deepEqual(neuronPlot.points, original.points, 'Existing maps retain their exact dates, counts, scope and quotes');
  assert.equal(bytePlot.references, undefined, 'Anatomical counts cannot be used as PB targets');
  for (const reference of neuronPlot.references) {
    assert.match(reference.sourceUrl, /^https:\/\//);
    assert.ok(reference.sourceTitle && reference.quote && reference.note);
    assert.match(reference.label, /≈/);
  }
  assert.match(neuronPlot.references[0].note, /10.41 million.*SD/);
  assert.match(neuronPlot.references[1].note, /olfactory bulbs excluded.*hemisphere.*doubled/);
  assert.match(neuronPlot.references[2].note, /adult male.*8.1 billion/);
});

test('preview and detail render faint dashed reference lines on the same neuron-count axis, without a fit', () => {
  for (const preview of [true, false]) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, {plot: neuronPlot, preview})));
    try {
      const doc = dom.window.document;
      const references = [...doc.querySelectorAll('[data-anatomical-reference]')];
      assert.equal(references.length, 3);
      assert.equal(doc.querySelectorAll('[data-source-observation]').length, 5);
      const grids = [...doc.querySelectorAll('.draft-plot-gridline')];
      const top = Math.min(...grids.map(line => Number(line.getAttribute('y1'))));
      const bottom = Math.max(...grids.map(line => Number(line.getAttribute('y1'))));
      for (const node of references) {
        const reference = neuronPlot.references.find(reference => reference.id === node.dataset.anatomicalReference);
        const line = node.querySelector('line');
        assert.equal(line.getAttribute('stroke-dasharray'), '5 5');
        assert.equal(Number(line.getAttribute('opacity')), 0.45);
        const y = Number(line.getAttribute('y1'));
        assert.ok(y >= top && y <= bottom);
        const expected = bottom - (Math.log10(reference.y) - 3) / (11 - 3) * (bottom - top);
        assert.equal(y, expected, 'Reference and observations share one log count scale');
        assert.ok(node.textContent.includes(reference.label));
      }
      assert.equal(doc.querySelectorAll('[data-extrapolation-line], [data-scenario-select], [role="switch"]').length, 0);
      if (!preview) {
        assert.equal(doc.querySelectorAll('tbody tr').length, 5, 'Context is separate from dated connectome observations');
        const context = doc.querySelector('[data-anatomical-reference-sources]');
        assert.ok(context);
        assert.equal(context.querySelectorAll('a').length, 3);
        assert.match(context.textContent, /Anatomical neuron counts/);
        assert.match(context.textContent, /6,376,160,000/);
        assert.match(context.textContent, /olfactory bulbs excluded/);
      }
    } finally { dom.window.close(); }
  }
});

test('the public-byte detail links to the existing source-qualified neuron-count view', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection), '#selected-public-image-resource-footprints');
  try {
    const link = document.querySelector('dialog[open] [data-related-chart]');
    assert.ok(link, 'An explicit related view makes the scale comparison reachable');
    assert.equal(link.getAttribute('href'), '#' + canonicalPerformanceAnchor('metric-panel-largest-connectome-neurons'));
    assert.match(link.textContent, /Neuron-count view/);
    assert.match(link.parentElement.textContent, /separate measurement/);
    await click(link);
    await settle();
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog.querySelector('h2').textContent, neuronPlot.title);
    assert.equal(dialog.querySelectorAll('[data-anatomical-reference]').length, 3);
    assert.equal(dialog.querySelectorAll('[data-source-observation]').length, 5);
  } finally { await cleanup(); }
});
