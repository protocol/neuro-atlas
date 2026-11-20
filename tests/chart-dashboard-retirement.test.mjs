import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import overviewModule from '../src/app/field-velocity/page.tsx';
import legacyModule from '../src/app/field-velocity/dashboard/page.tsx';
import * as graphModule from '../src/app/field-velocity/[slug]/page.tsx';
import { FIELD_VELOCITY_GRAPHS } from '../src/data/field-velocity-links.ts';
import { ChartExplorationContext } from '../src/components/chart-exploration-context.ts';
import { ChartActions } from '../src/components/chart-actions.tsx';

globalThis.React = React;
const Overview = overviewModule.default ?? overviewModule;
const graphPage = graphModule.default.default ?? graphModule.default;

test('the catalog and every single-chart page offer no custom-dashboard actions', async () => {
  const LegacyPage = legacyModule.default ?? legacyModule;
  const pages = [React.createElement(LegacyPage), React.createElement(Overview), ...await Promise.all(FIELD_VELOCITY_GRAPHS.map(({ slug }) => graphPage({ params: Promise.resolve({ slug }) })))];
  for (const page of pages) {
    const html = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: {} }, page));
    const dom = new JSDOM(html);
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelectorAll('[data-add-to-dashboard], [data-open-dashboard], [data-dashboard]').length, 0, 'no composer entry points');
      assert.equal(doc.querySelectorAll('a[href*="/field-velocity/dashboard"]').length, 0, 'no new legacy links');
      assert.doesNotMatch(doc.body.textContent, /dashboard|Compare charts/i);
      if (doc.querySelector('[data-graph-page]')) assert.equal(doc.querySelectorAll('.graph-detail').length, 1);
    } finally { dom.window.close(); }
  }
});

test('unsupported selected-view exports give honest reset guidance without offering a dashboard', () => {
  for (const settings of [{ hidden: ['Speech decoding'] }, { extrapolate: true }, { sensory: true }, { voxels: true }, { benchmark: true }]) {
    const html = renderToStaticMarkup(React.createElement(ChartExplorationContext.Provider, { value: { settings, update() {} } },
      React.createElement(ChartActions, { anchor: 'fixture', title: 'Selected chart' })));
    assert.match(html, /Chart images and graph links are unavailable/);
    assert.match(html, /Reset the view/);
    assert.doesNotMatch(html, /dashboard/i);
  }
});

test('custom-dashboard runtime, persistence, composition flags, and CSS are removed rather than hidden', () => {
  for (const path of ['src/components/exploration-dashboard.tsx', 'src/components/dashboard-add-link.tsx', 'src/components/use-dashboard-layout.ts', 'src/lib/dashboard-state.ts']) {
    assert.equal(existsSync(new URL('../' + path, import.meta.url)), false, path);
  }
  for (const path of ['src/components/chart-exploration-context.ts', 'src/components/field-velocity-graph.tsx', 'src/components/chart-actions.tsx', 'src/components/draft-chart-plot.tsx', 'src/components/performance-curves.tsx', 'src/components/exploration-legend.tsx', 'src/app/field-velocity/graph-page.css']) {
    assert.doesNotMatch(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), /dashboard|CardSettings|instance\??:/i, path);
  }
  assert.ok(existsSync(new URL('../src/components/funding-index-dashboard.tsx', import.meta.url)), 'unrelated Funding dashboard stays');
});
