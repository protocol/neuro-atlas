import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const neurons = METRIC_CHART_EVIDENCE['Largest published connectome over time'].plots.find(plot => plot.id === 'largest-connectome-neurons');
const eyewire = neurons.points.find(point => point.id === 'eyewire-ii-neurons-2026');
const sheetCredit = {
  title: 'EM Datasets, shared by Forrest Collman',
  url: 'https://docs.google.com/spreadsheets/d/1PukHvhxTqC72tau9HDnq1LKIl3F6V_FGr_y3G-jjZ-k/edit#gid=0',
};
const anchor = 'metric-panel-largest-connectome-neurons';
const mountNeurons = () => mount(React.createElement(DraftChartPanel, { plot: neurons, anchor }), '#selected-published-connectomes-neuron-counts');

test('modal Sources credits the discovery spreadsheet separately from the primary point papers', async () => {
  const cleanup = await mountNeurons();
  try {
    const modal = document.querySelector('dialog[open]');
    assert.equal(modal?.querySelector('h2').textContent, neurons.title);
    const sources = modal.querySelector('.mx-sources');
    const credit = [...sources.querySelectorAll('a')].filter(link => link.href === sheetCredit.url);
    assert.equal(credit.length, 1, 'Expected one linked discovery-source credit in Sources');
    assert.equal(credit[0].textContent.trim(), `${sheetCredit.title} ↗`);
    for (const point of neurons.points) assert.ok(sources.querySelector(`a[href="${point.sourceUrl}"]`));
    const row = [...modal.querySelectorAll('tbody tr')].find(row => row.querySelector('th').textContent.includes('Eyewire II'));
    assert.ok(row, 'Eyewire II has a source row');
    assert.equal(row.cells[2].textContent, '>25,000');
    assert.equal(row.querySelector('a').href, eyewire.sourceUrl);
    assert.equal(row.querySelector('blockquote').textContent, eyewire.quote);
    assert.ok(row.textContent.includes(eyewire.note));
  } finally { await cleanup(); }
});

test('selected data download preserves sheet credit and exact primary points', async () => {
  const cleanup = await mountNeurons();
  try {
    const download = document.querySelector('dialog[open] .mx-data a[data-selected-plot-json]');
    assert.equal(download?.download, `neuro-atlas-${neurons.id}.json`);
    const prefix = 'data:application/json;charset=utf-8,';
    assert.ok(download.href.startsWith(prefix));
    const data = JSON.parse(decodeURIComponent(download.href.slice(prefix.length)));
    assert.deepEqual(data.curationSource, sheetCredit);
    assert.deepEqual(data.points, neurons.points);
    assert.deepEqual(data.points.filter(point => point.id === eyewire.id).map(({ y, qualifier, sourceUrl }) => [y, qualifier, sourceUrl]), [[25000, '>', eyewire.sourceUrl]]);
  } finally { await cleanup(); }
});

test('the actual chart export shows the Eyewire II lower bound and keeps the Neuro Atlas footer', async () => {
  const cleanup = await mountNeurons();
  let output;
  try {
    const preview = document.querySelector('[data-draft-preview] [data-qualified-observation="eyewire-ii-neurons-2026"]');
    assert.match(preview?.textContent, /Eyewire II: >25,000/);
    const registration = await whenChartRegistered(anchor);
    const specification = registration.getChart();
    assert.ok(specification.svg === document.querySelector('dialog[open] .draft-plot-svg'));
    output = new JSDOM(buildChartImage(specification, window.location.href).svg, { contentType: 'image/svg+xml' });
    const doc = output.window.document;
    const key = [...doc.querySelectorAll('[data-export-point-key-entry]')].map(entry => [...entry.querySelectorAll('text')].map(line => line.textContent).join(' '));
    assert.ok(key.some(text => /Eyewire II.*2026 preprint.*>25,000 neurons/.test(text)), 'Eyewire II bound must be visible in the image key');
    assert.equal(doc.querySelector('[data-export-info]')?.textContent, 'More information on Neuro Atlas.');
    assert.ok(doc.querySelector('[data-export-footer]').textContent.includes('/field-velocity/selected-published-connectomes-neuron-counts'));
  } finally { output?.window.close(); await cleanup(); }
});
