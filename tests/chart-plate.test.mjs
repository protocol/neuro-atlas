import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as pageModule from '../src/app/field-velocity/[slug]/page.tsx';
import * as overviewModule from '../src/app/field-velocity/page.tsx';
import * as layoutModule from '../src/app/field-velocity/layout.tsx';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { FIELD_VELOCITY_GRAPHS } from '../src/data/field-velocity-links.ts';
import { withGraphExport } from '../src/lib/chart-export-api.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { click, mount } from './modal-helpers.mjs';

globalThis.React = React;
const Page = pageModule.default.default ?? pageModule.default;
const marks = root => [...root.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse')].filter(node => !node.closest('[data-export-exclude]')).map(node => [node.localName, ...['cx','cy','x','y','d','points','x1','x2','y1','y2','width','height'].map(key => node.getAttribute(key))]);

for (const entry of FIELD_VELOCITY_GRAPHS) test(`${entry.slug}: shared live chart plate brands the plot, separates editing and retains export custody`, async () => {
  const cleanup = await mount(await Page({params: Promise.resolve({slug: entry.slug})}), '', win => win.history.replaceState({}, '', '/field-velocity/' + entry.slug));
  try {
    const plate = document.querySelector('[data-chart-plate]');
    assert.ok(plate, 'all renderer families use the shared plate');
    assert.equal(plate.querySelector('[data-chart-plate-brand]').textContent, 'Neuro Atlas');
    const plot = plate.querySelector('svg'); assert.ok(plot, 'real live vector plot, not an image');
    assert.ok(plate.querySelector('[data-chart-plate-brand]').compareDocumentPosition(plot) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'brand is above the actual plot');
    assert.ok(plate.querySelector('[data-chart-plate-title]').textContent.length > 0);
    assert.ok(plate.querySelector('img, canvas, [data-chart-actions], [role=switch], select, [role=radio], .pc-methodology:not([data-latency-identity]), [data-draft-methodology]') === null, 'controls and long methodology are outside clean screenshot boundary');
    assert.ok(document.querySelector('[data-chart-actions]'), 'sharing stays available outside plate');
    assert.ok(document.querySelector('table, .draft-event-list'), 'source evidence retained');
    const original = marks(plate.querySelector('svg'));
    const image = await withGraphExport(entry.slug, getChart => buildChartImage(getChart(), window.location.href));
    const { JSDOM } = await import('jsdom');
    const exported = new JSDOM(image.svg, {contentType:'image/svg+xml'});
    assert.deepEqual(marks(exported.window.document.querySelector('svg svg')), original, 'export still owns the real plotted marks, not a framing SVG');
    assert.match(image.svg, /More information on Neuro Atlas/);
    assert.doesNotMatch(image.url, /utm_/);
    exported.window.close();
  } finally { await cleanup(); }
});

test('overview previews share a restrained Neuro Atlas identity and expanded exploration uses the same plate', async () => {
  const Overview = overviewModule.default.default ?? overviewModule.default;
  const Layout = layoutModule.default.default ?? layoutModule.default;
  const cleanup = await mount(React.createElement(AppRouterContext.Provider, {value:{}},React.createElement(Layout,null,React.createElement(Overview))), '#metrics');
  try {
    const bodies = [...document.querySelectorAll('[data-metric-card-body]')];
    assert.equal(bodies.length,25);
    for(const body of bodies) assert.equal(body.querySelector('[data-chart-preview-brand]')?.textContent,'Neuro Atlas');
    await click(document.querySelector('[data-draft-popout-trigger="metric-panel-bci-bitrate"]'));
    const plate=document.querySelector('dialog[open] [data-chart-plate]'); assert.ok(plate);
    assert.equal(plate.querySelector('[data-chart-plate-brand]').textContent,'Neuro Atlas');
    assert.equal(plate.querySelector('[role=switch], [data-chart-actions]'),null);
    assert.ok(plate.querySelector('button[data-exploration-series]'), 'the visible chart legend keeps native interaction');
    assert.ok(plate.querySelector('[data-point-annotation]'),'essential visible study key stays with the chart');
  } finally { await cleanup(); }
});


test('the screenshot-ready legend stays directly interactive rather than duplicating controls above the plot', async () => {
  const cleanup = await mount(await Page({ params: Promise.resolve({ slug: 'bci-information-transfer-over-time' }) }), '', win => win.history.replaceState({}, '', '/field-velocity/bci-information-transfer-over-time'));
  try {
    const plate = document.querySelector('[data-chart-plate]');
    const speech = plate.querySelector('button[data-exploration-series="Speech decoding"]');
    assert.ok(speech, 'the visible legend itself remains the interaction target');
    assert.equal(document.querySelectorAll('button[data-exploration-series="Speech decoding"]').length, 1);
    await click(speech);
    assert.equal(speech.getAttribute('aria-pressed'), 'false');
    assert.equal(plate.querySelectorAll('svg [data-source-observation]').length, 9);
    assert.equal(new URL(window.location.href).searchParams.get('chartHidden'), 'bci-information-transfer-over-time:speech');
  } finally { await cleanup(); }
});
