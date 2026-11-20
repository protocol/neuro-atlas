import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { FieldVelocityGraphDetail } from '../src/components/field-velocity-graph.tsx';
import { fieldVelocityGraph } from '../src/data/field-velocity-links.ts';
import { atlasPath } from '../src/lib/atlas-path.ts';
import { mount, settle } from './modal-helpers.mjs';

globalThis.React = React;
const slug = 'bci-information-transfer-over-time';

test('standalone SSR retains the merged reading/source/data support frame and scientific evidence', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(FieldVelocityGraphDetail, { entry: fieldVelocityGraph(slug) })));
  const root = dom.window.document;
  try {
    assert.ok(root.querySelector('.graph-detail.metrics-index .mx-grid > .mx-left'), 'reading column uses the merged readable layout');
    assert.ok(root.querySelector('.graph-detail .mx-grid > .mx-right .mx-sources'), 'source column has its own region');
    assert.ok(root.querySelector('.graph-detail > .mx-data'), 'table retains a full-width region');
    assert.equal(root.querySelectorAll('[data-source-observation]').length, 14);
    assert.equal(root.querySelectorAll('tbody tr').length, 14, 'SSR retains source rows before client slot targets mount');
    assert.equal(root.querySelectorAll('[data-draft-methodology]').length, 1);
  } finally { dom.window.close(); }
});

test('hydrated standalone support regions contain each static definition, scope and source table once', async () => {
  const cleanup = await mount(React.createElement(FieldVelocityGraphDetail, { entry: fieldVelocityGraph(slug) }), '', win => {
    win.history.replaceState({}, '', atlasPath('/field-velocity/' + slug));
  });
  try {
    await settle();
    const frame = document.querySelector('.graph-detail');
    assert.equal(frame.querySelectorAll('.mx-left [data-draft-methodology]').length, 1);
    assert.equal(frame.querySelector('.mx-left [data-draft-methodology]').tagName, 'SECTION');
    assert.ok(frame.querySelector('.mx-sources > *'), 'actual source notes populate the right column');
    assert.equal(frame.querySelectorAll('.mx-data tbody tr').length, 14);
    assert.equal(frame.querySelectorAll('table').length, 1);
    assert.equal(frame.querySelectorAll('[data-draft-methodology]').length, 1);
    assert.equal(frame.querySelectorAll('[data-source-observation]').length, 14);
    assert.equal(frame.querySelectorAll('.mx-scope-line').length, 1);
  } finally { await cleanup(); }
});
