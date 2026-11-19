import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { ModalSlotsContext } from '../src/components/chart-modal-slots.tsx';
import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const anchor = 'metric-panel-largest-connectome-neurons';
const principal = { role: 'Reconstruction', title: 'Reconstruction paper', url: 'https://example.org/reconstruction' };
const imagery = { role: 'Underlying imagery', title: 'Original image-volume paper', url: 'https://example.org/imagery' };
const point = { id: 'sample', x: 2024, y: 10, label: 'Sample reconstruction', dateLabel: '2024 publication', quote: 'Ten neurons.', sourceUrl: principal.url, sourceTitle: principal.title, sourceRole: principal.role, supportingReferences: [imagery] };
const plot = { id: 'references-fixture', title: 'Confirmed references', xLabel: 'Year', yLabel: 'Neurons', scale: 'linear', scope: 'Synthetic test data only.', points: [point] };

async function mountPlot(selected = plot) {
  function SlottedPlot() {
    return React.createElement(ModalSlotsContext.Provider, { value: Object.fromEntries(['sources', 'data', 'actions'].map(kind => [kind, document.getElementById(kind)])) }, React.createElement(DraftChartPlot, { plot: selected, shareAnchor: anchor }));
  }
  return mount(React.createElement(SlottedPlot), '', win => {
    for (const kind of ['sources', 'data', 'actions']) {
      const region = win.document.createElement('div'); region.id = kind; win.document.body.append(region);
    }
  });
}
function assertReferences(region, references = [principal, imagery]) {
  const links = [...region.querySelectorAll('a')];
  assert.deepEqual(links.map(link => link.href), references.map(reference => reference.url));
  for (const reference of references) {
    assert.ok(region.textContent.includes(`${reference.role}:`), `Explicit role: ${reference.role}`);
    assert.ok(region.textContent.includes(reference.title), `Citation: ${reference.title}`);
  }
}

test('confirmed supporting references carry distinct roles through rendered details, sources, accessibility and export metadata', async () => {
  const cleanup = await mountPlot();
  try {
    const mark = document.querySelector('[data-source-observation="sample"]');
    await act(async () => mark.focus());
    assertReferences(document.querySelector('[role="tooltip"]'));
    assertReferences(document.querySelector('#sources .pc-sources'));
    assertReferences(document.querySelector('#data tbody td:last-child'));
    for (const reference of [principal, imagery]) assert.ok(mark.getAttribute('aria-label').includes(`${reference.role}: ${reference.title}`));
    const spec = (await whenChartRegistered(anchor, 0)).getChart();
    const output = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
    try {
      const description = output.window.document.querySelector('desc').textContent;
      for (const reference of [principal, imagery]) {
        assert.ok(description.includes(`${reference.role}: ${reference.title}`));
        assert.ok(description.includes(reference.url));
      }
    } finally { output.window.close(); }
  } finally { await cleanup(); }
});


test('duplicate exact URLs retain the principal citation and one confirmed supporting link without promoting candidates', async () => {
  const selected = { ...plot, points: [{ ...point, supportingReferences: [
    { role: 'Duplicate principal', title: 'Not the metric citation', url: principal.url }, imagery, { ...imagery, title: 'Repeated imagery' },
  ], candidateSources: [{ title: 'Unconfirmed lead', url: 'https://example.org/candidate', note: 'Unconfirmed.' }], calculationSource: { title: 'Calculation methods', url: 'https://example.org/calculation' } }] };
  const cleanup = await mountPlot(selected);
  try {
    await act(async () => document.querySelector('[data-source-observation]').focus());
    assertReferences(document.querySelector('[role="tooltip"] [data-confirmed-references]'));
    assertReferences(document.querySelector('#sources .pc-sources'));
    assertReferences(document.querySelector('#data [data-confirmed-references]'));
    const spec = (await whenChartRegistered(anchor, 0)).getChart();
    const sources = spec.notes.find(note => note.startsWith('Sources:'));
    for (const reference of [principal, imagery]) assert.equal(sources.split(reference.url).length - 1, 1);
    assert.doesNotMatch(sources, /candidate|calculation|Duplicate principal|Repeated imagery/);
    assert.ok(document.querySelector('[role="tooltip"] [data-candidate-sources]'), 'Candidates remain explicitly unconfirmed and separate');
    assert.ok(document.querySelector('[role="tooltip"] [data-calculation-source]'), 'Calculation methods remain separate');
  } finally { await cleanup(); }
});

test('legacy single-source output remains unchanged, including unlinked unresolved sources and export titles', async () => {
  const legacy = { ...point }; delete legacy.sourceRole; delete legacy.supportingReferences;
  const selected = { ...plot, points: [legacy, { ...legacy, id: 'unresolved', sourceTitle: 'Unresolved source', sourceUrl: undefined }] };
  const cleanup = await mountPlot(selected);
  try {
    await act(async () => document.querySelector('[data-source-observation="sample"]').focus());
    const popup = document.querySelector('[role="tooltip"]');
    assert.equal(popup.querySelectorAll('a').length, 1);
    assert.equal(popup.querySelector('a').textContent, `${principal.title} ↗`);
    assert.equal(popup.querySelector('[data-confirmed-references]'), null);
    assert.equal(document.querySelector('#sources .pc-sources').textContent, `${principal.title} ↗`);
    const rows = document.querySelectorAll('#data tbody tr');
    assert.equal(rows[1].querySelector('a'), null);
    assert.equal(rows[1].querySelector('td:last-child > span').textContent, 'Unresolved source');
    assert.equal(document.querySelector('[data-source-observation="sample"]').getAttribute('aria-label'), 'Sample reconstruction; ; 2024 publication; Neurons: 10; Reconstruction paper');
    const spec = (await whenChartRegistered(anchor, 0)).getChart();
    assert.equal(spec.notes.at(-1), 'Sources: Reconstruction paper; Unresolved source');
  } finally { await cleanup(); }
});


import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
const affectedPlotIds = ['tissue-cm3', 'largest-connectome-neurons', 'largest-connectome-synapses', 'proofreading-effort', 'public-data-size'];
const compactCredit = 'EM imagery: Zheng, Lauritzen et al. (2018) · Connectome: Dorkenwald et al. / FlyWire Consortium (2024)';
for (const plotId of affectedPlotIds) test(`${plotId}: actual reader evidence exposes the confirmed credit and exports only the compact paired dataset credit`, async () => {
  const selected = Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots).find(plot => plot.id === plotId);
  const observed = selected.points.find(point => point.id.startsWith('flywire-') || point.id === 'fafb-image-download-2018');
  const cleanup = await mountPlot(selected);
  try {
    const mark = document.querySelector(`[data-source-observation="${observed.id}"]`);
    await act(async () => mark.focus());
    const refs = [{ role: observed.sourceRole, title: observed.sourceTitle, url: observed.sourceUrl }, ...observed.supportingReferences ?? []];
    assertReferences(document.querySelector('[role="tooltip"] [data-confirmed-references]'), refs);
    await act(async () => { mark.blur(); mark.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    assert.equal(document.querySelector('[role="tooltip"]').dataset.pinned, 'true', 'Tap/click retains actionable source details');
    assertReferences(document.querySelector('[role="tooltip"] [data-confirmed-references]'), refs);
    const rows = [...document.querySelectorAll('#data tbody tr')];
    const row = rows.find(row => row.querySelector('th').textContent.startsWith(observed.label));
    assertReferences(row.querySelector('[data-confirmed-references]'), refs);
    for (const ref of refs) {
      assert.ok(document.querySelector('#sources').textContent.includes(`${ref.role}:`));
      assert.ok([...document.querySelectorAll('#sources a')].some(link => link.href === ref.url));
      assert.ok(mark.getAttribute('aria-label').includes(`${ref.role}: ${ref.title}`));
    }
    assert.equal(document.querySelectorAll('[data-source-observation]').length, selected.points.length);
    const spec = (await whenChartRegistered(anchor, 0)).getChart();
    assert.equal(spec.datasetCredit, compactCredit);
    const output = new JSDOM(buildChartImage(spec, window.location.href).svg, { contentType: 'image/svg+xml' });
    const noCredit = new JSDOM(buildChartImage({ ...spec, datasetCredit: undefined }, window.location.href).svg, { contentType: 'image/svg+xml' });
    try {
      const doc = output.window.document;
      assert.equal([...doc.querySelectorAll('[data-export-dataset-credit] text')].map(text => text.textContent).join(' '), compactCredit);
      assert.equal(doc.querySelector('[data-export-footer]').outerHTML.replaceAll(/y[12]?="[^"]*"/g, ''), noCredit.window.document.querySelector('[data-export-footer]').outerHTML.replaceAll(/y[12]?="[^"]*"/g, ''), 'The normal branding footer is unchanged');
      assert.equal(doc.querySelectorAll('[data-export-footnotes], [data-export-note]').length, 0);
      for (const ref of refs) {
        assert.ok(doc.querySelector('desc').textContent.includes(`${ref.role}: ${ref.title}`));
        assert.ok(doc.querySelector('desc').textContent.includes(ref.url));
      }
      const attributes = ['cx', 'cy', 'x', 'y', 'r', 'points', 'stroke-width'];
      const geometry = container => [...container.querySelectorAll('[data-source-observation]')].map(mark => [mark.getAttribute('data-source-observation'), ...attributes.map(attr => mark.getAttribute(attr))]);
      assert.deepEqual(geometry(doc), geometry(document));
      assert.deepEqual(geometry(doc), geometry(noCredit.window.document));
    } finally { output.window.close(); noCredit.window.close(); }
  } finally { await cleanup(); }
});
