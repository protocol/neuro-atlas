import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { DraftChartPanel } from '../src/components/draft-chart-panel.tsx';
import { mount, click, settle } from './modal-helpers.mjs';
import { performanceUrl } from '../src/lib/field-velocity/navigation.ts';
import { chartShareUrl } from '../src/lib/chart-export.ts';
import { ALL_NEURON_REFERENCES, neuronReferencesFromUrl, neuronReferenceToken } from '../src/lib/neuron-reference-url.ts';
globalThis.React = React;
const plot = Object.values(METRIC_CHART_EVIDENCE).flatMap(e => e.plots).find(p => p.id === 'largest-connectome-neurons');
const anchor = 'metric-panel-largest-connectome-neurons';
const slug = 'selected-published-connectomes-neuron-counts';
const ids = ['mouse', 'macaque', 'human'];
const panel = () => React.createElement(DraftChartPanel, { plot, anchor });
const toggle = () => document.querySelector('dialog button[data-neuron-reference-toggle]');

test('one default-off switch below the SVG shows and hides all three references without changing preview or sources', async () => {
  const source = JSON.stringify(plot);
  const cleanup = await mount(panel(), '#' + slug);
  try {
    const switches = [...document.querySelectorAll('dialog button[role=switch]')];
    assert.deepEqual(switches.map(b => b.textContent), ['Whole-brain references']);
    const control = switches[0];
    assert.equal(control.type, 'button');
    assert.equal(control.getAttribute('aria-checked'), 'false');
    assert.ok(control.querySelector('.brain-scale-switch[aria-hidden=true]'));
    assert.ok(control.parentElement.matches('.brain-scale-controls'));
    assert.equal(control.parentElement.previousElementSibling.tagName.toLowerCase(), 'svg', 'Same under-plot placement as neighboring benchmark');
    assert.equal(control.parentElement.querySelector('p, h2, h3, h4, [role=group]'), null, 'No redundant heading or species group');
    assert.equal(document.querySelector('[data-draft-preview] [role=switch]'), null);
    const preview = document.querySelector('[data-draft-preview] svg').outerHTML;
    const rows = document.querySelector('dialog tbody').outerHTML;
    const offSvg = document.querySelector('dialog svg.draft-plot-svg').outerHTML;
    for (const enabled of [false, true, false]) {
      if ((control.getAttribute('aria-checked') === 'true') !== enabled) await click(control);
      const visible = enabled ? ids : [];
      const svg = document.querySelector('dialog svg.draft-plot-svg');
      assert.deepEqual([...svg.querySelectorAll('[data-anatomical-reference]')].map(n => n.dataset.anatomicalReference), visible);
      assert.deepEqual([...svg.querySelectorAll('[data-anatomical-reference-label]')].map(n => n.dataset.anatomicalReferenceLabel), visible);
      const ys = plot.points.map(p => p.y);
      const refs = enabled ? plot.horizontalReferences : [];
      const min = Math.floor(Math.log10(Math.min(...ys)));
      const max = Math.max(Math.ceil(Math.log10(Math.max(...ys))), ...refs.map(r => Math.ceil(Math.log10(r.value) + .15)));
      const bottom = Number(svg.querySelector('.draft-plot-axis').getAttribute('y1'));
      const top = Math.min(...[...svg.querySelectorAll('.draft-plot-gridline')].map(n => Number(n.getAttribute('y1'))));
      const mapY = value => bottom - (Math.log10(value) - min) / (max - min) * (bottom - top);
      for (const p of plot.points) assert.ok(Math.abs(Number(svg.querySelector(`[data-source-observation="${p.id}"]`).getAttribute('cy')) - mapY(p.y)) < 1e-9, p.id + ': selected domain');
      assert.equal(svg.querySelectorAll('[data-source-observation]').length, 10);
      assert.equal(document.querySelector('dialog tbody').outerHTML, rows);
      assert.equal(document.querySelector('[data-draft-preview] svg').outerHTML, preview);
      if (!enabled) assert.equal(svg.outerHTML, offSvg, 'Turning off exactly restores the observation-only SVG');
    }
    assert.equal(JSON.stringify(plot), source, 'Source objects are never mutated');
  } finally { await cleanup(); }
});

const base = 'https://atlas.example/neuro-atlas/field-velocity?ref=a&ref=b';
const initial = url => win => win.history.replaceState({ __NA: true, router: ['retained'], atlasModalFrom: null }, '', url);
const visibleIds = () => [...document.querySelectorAll('dialog [data-anatomical-reference]')].map(n => n.dataset.anatomicalReference);

test('binary reference views survive fresh canonical and legacy entry, copy links, history and one-action dismissal', async () => {
  for (const fragment of [slug, anchor, 'draft-panel-largest-connectome-neurons']) {
    const cleanup = await mount(panel(), '', initial(`${base}&neuronRefs=none#${fragment}`));
    try {
      assert.deepEqual(visibleIds(), [], 'Fresh recipient restores all-off references');
      assert.equal(window.location.hash, '#' + slug);
      assert.equal(window.history.length, 1);
      await click(toggle());
      const on = window.location.href;
      assert.equal(new URL(on).searchParams.get('neuronRefs'), ALL_NEURON_REFERENCES);
      assert.deepEqual(visibleIds(), ids);
      await click(toggle());
      const selected = window.location.href;
      assert.equal(new URL(selected).searchParams.has('neuronRefs'), false, 'Default-off omits the token');
      assert.deepEqual(new URL(selected).searchParams.getAll('ref'), ['a', 'b']);
      assert.deepEqual(window.history.state, { __NA: true, router: ['retained'], atlasModalFrom: null });
      await React.act(async () => window.history.back());
      for (let n = 0; n < 30 && window.location.href !== on; n++) await settle();
      assert.deepEqual(visibleIds(), ids);
      await React.act(async () => window.history.forward());
      for (let n = 0; n < 30 && window.location.href !== selected; n++) await settle();
      assert.deepEqual(visibleIds(), []);
      const saved = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      let copied;
      try {
        Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied = text; } } } });
        await click(document.querySelector('dialog [data-copy-draft-link]'));
        assert.equal(copied, selected);
      } finally { if (saved) Object.defineProperty(globalThis, 'navigator', saved); else delete globalThis.navigator; }
      await click(document.querySelector('dialog .pc-modal-close'));
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(new URL(window.location.href).searchParams.has('neuronRefs'), false);
    } finally { await cleanup(); }
  }
});

import { whenChartRegistered } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { JSDOM } from 'jsdom';

test('both selected image/clipboard specs and JSON preserve visible overlays, qualified URL and complete archived source', async () => {
  for (const enabled of [false, true]) {
    const visible = enabled ? ids : [];
    const token = enabled ? `&neuronRefs=${ALL_NEURON_REFERENCES}` : '';
    const cleanup = await mount(panel(), '', initial(`${base}&token=private${token}#${slug}`));
    try {
      const spec = (await whenChartRegistered(anchor, 0)).getChart();
      const image = buildChartImage(spec, window.location.href);
      const imageUrl = new URL(image.url);
      assert.equal(imageUrl.searchParams.get('neuronRefs'), enabled ? ALL_NEURON_REFERENCES : null);
      assert.deepEqual([...imageUrl.searchParams.keys()], enabled ? ['neuronRefs'] : []);
      const exported = new JSDOM(image.svg, { contentType: 'image/svg+xml' });
      try {
        const text = [...exported.window.document.querySelectorAll('text')].map(n => n.textContent);
        for (const ref of plot.horizontalReferences) {
          assert.equal(text.includes(ref.label), visible.includes(ref.id));
          assert.equal(spec.notes.some(note => note.startsWith('Whole-brain anatomical estimate: ' + ref.label)), visible.includes(ref.id));
        }
        assert.equal(text.includes('Anatomical scale'), visible.length > 0);
      } finally { exported.window.close(); }
      const json = JSON.parse(decodeURIComponent(document.querySelector('dialog [data-selected-plot-json]').href.split(',').slice(1).join(',')));
      assert.deepEqual(json.visibleNeuronReferences, visible);
      const { visibleNeuronReferences, ...source } = json;
      assert.deepEqual(source, plot, 'All reference definitions and ten observations remain archived');
      assert.equal(document.querySelectorAll('dialog [data-anatomical-sources] li').length, 3);
      for (const target of ['metric-panel-public-data-size', 'metric-panel-acquisition-economics', 'performance_curves']) {
        assert.equal(new URL(performanceUrl(window.location.href, target)).searchParams.has('neuronRefs'), false);
        assert.equal(new URL(chartShareUrl(window.location.href, target)).searchParams.has('neuronRefs'), false);
      }
    } finally { await cleanup(); }
  }
});

test('reference URLs normalize every valid legacy subset to all-on and reject malformed or cross-chart state to off', () => {
  for (const fragment of [slug, anchor, 'draft-panel-largest-connectome-neurons']) {
    for (const token of ['mouse', 'macaque', 'human', 'human,mouse', 'macaque,human', 'macaque,mouse', 'human,macaque,mouse']) {
      const url = new URL(`${base}&neuronRefs=${token}#${fragment}`);
      assert.equal(neuronReferencesFromUrl(url, anchor), ALL_NEURON_REFERENCES, token + ': binary legacy on');
      const canonical = new URL(performanceUrl(url.href, anchor));
      assert.equal(canonical.searchParams.get('neuronRefs'), ALL_NEURON_REFERENCES);
      assert.deepEqual(canonical.searchParams.getAll('ref'), ['a', 'b']);
      assert.equal(canonical.hash, '#' + slug);
    }
    for (const query of ['', 'neuronRefs=none', 'neuronRefs=', 'neuronRefs=mouse,mouse', 'neuronRefs=human,unknown', 'neuronRefs=none,mouse', 'neuronRefs=mouse&neuronRefs=human', 'neuronRefs=none&neuronRefs=none']) {
      const url = new URL(`${base}&${query}#${fragment}`);
      assert.equal(neuronReferencesFromUrl(url, anchor), 'none', query + ': default off');
      assert.equal(new URL(performanceUrl(url.href, anchor)).searchParams.has('neuronRefs'), false);
    }
  }
  for (const other of ['metric-panel-public-data-size', 'metric-panel-acquisition-economics', 'performance_curves']) {
    const wrongChart = new URL(`${base}&neuronRefs=${ALL_NEURON_REFERENCES}#${other}`);
    assert.equal(neuronReferencesFromUrl(wrongChart, anchor), 'none');
    assert.equal(new URL(performanceUrl(wrongChart.href, anchor)).searchParams.has('neuronRefs'), false);
    assert.equal(neuronReferencesFromUrl(new URL(`${base}&neuronRefs=mouse#${slug}`), other), 'none');
  }
  assert.equal(neuronReferenceToken('none'), undefined);
  assert.equal(neuronReferenceToken(ALL_NEURON_REFERENCES), ALL_NEURON_REFERENCES);
  const privateUrl = `https://private:secret@atlas.example/neuro-atlas/field-velocity?neuronRefs=human,mouse&secret=private#${slug}`;
  assert.equal(chartShareUrl(privateUrl, anchor), `https://atlas.example/neuro-atlas/field-velocity?neuronRefs=mouse%2Cmacaque%2Chuman#${slug}`);
});

test('rescaling clears pinned inspection without stealing switch focus and Escape dismisses the modal once', async () => {
  const cleanup = await mount(panel(), '#' + slug);
  try {
    await React.act(async () => document.querySelector('dialog [data-source-observation]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.ok(document.querySelector('[data-point-tooltip][data-pinned]'));
    await React.act(async () => toggle().focus());
    await click(toggle());
    assert.equal(document.querySelector('[data-point-tooltip]'), null);
    assert.equal(document.activeElement, toggle());
    await React.act(async () => document.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('dialog'), null);
  } finally { await cleanup(); }
});
