import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { PublicationCharts } from '../src/components/publication-charts.tsx';
import { syntheticPublicationEndpointSnapshot, syntheticMatchedGrowth } from './fixtures/publication-synthetic.mjs';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const snapshot = () => ({ ...syntheticPublicationEndpointSnapshot(), matchedGrowth: syntheticMatchedGrowth() });
const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);

test('annual publication preview dots grow 80% while full-chart and export radii stay unchanged', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot: snapshot(), allowTestFixture: true }), '#neurotech-papers-per-year');
  try {
    const preview = document.querySelector('[data-publication-card="publication-output"] .publication-preview svg');
    const full = document.querySelector('dialog[open] .publication-full-plot svg');
    assert.ok(preview && full);
    const marks = [...preview.querySelectorAll('[data-publication-mark]')];
    assert.ok(marks.length > 0);
    for (const mark of marks) {
      closeTo(Number(mark.getAttribute('r')), 7.2, 'Preview radius at the unscaled test frame');
      assert.equal(mark.getAttribute('data-export-r'), '5');
      const paired = full.querySelector(`[data-year="${mark.dataset.year}"]`);
      assert.ok(paired);
      assert.equal(mark.dataset.value, paired.dataset.value, 'Source paper count is unchanged');
    }
    for (const mark of full.querySelectorAll('[data-publication-mark]')) {
      assert.equal(mark.getAttribute('r'), '5');
      assert.equal(mark.getAttribute('data-export-r'), '5');
    }
    assert.equal(preview.querySelector('[data-annual-anchor] circle').getAttribute('r'), '8', 'The anchor is a reference ring, not a data dot');
  } finally { await cleanup(); }
});

test('publication growth preview endpoint dots grow 80% without changing full-chart dots, centers, or legend keys', async () => {
  const cleanup = await mount(React.createElement(PublicationCharts, { snapshot: snapshot(), allowTestFixture: true }), '#publication-growth');
  try {
    const preview = document.querySelector('[data-publication-card="publication-growth"] .publication-preview svg');
    const full = document.querySelector('dialog[open] .publication-full-plot svg');
    assert.ok(preview && full);
    const previewMarks = [...preview.querySelectorAll('[data-growth-series="neurotech"]')];
    assert.equal(previewMarks.length, 21);
    for (const mark of previewMarks) {
      closeTo(Number(mark.getAttribute('r')), 9, 'Five-unit endpoint radius × 1.8');
      const row = mark.closest('[data-growth-row]');
      const stem = row.querySelector('[data-growth-stem]');
      assert.equal(mark.getAttribute('cx'), stem.getAttribute('x2'), 'Keep the exact endpoint');
      assert.equal(mark.getAttribute('cy'), stem.getAttribute('y2'));
      const paired = full.querySelector(`[data-growth-row="${row.dataset.growthRow}"]`);
      assert.equal(row.dataset.value, paired.dataset.value);
      assert.equal(paired.querySelector('circle').getAttribute('r'), '5');
    }
    for (const mark of preview.querySelectorAll('[data-growth-legend-swatch]')) assert.equal(mark.getAttribute('r'), '5.5', 'Legend swatches are not observation marks');
  } finally { await cleanup(); }
});
