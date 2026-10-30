import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { mount, click } from './modal-helpers.mjs';
globalThis.React = React;
const Page = FieldVelocityPage.default ?? FieldVelocityPage;

test('preview cards avoid generic source-status labels while retaining scope, qualifiers and full chart notes', async () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    assert.equal(dom.window.document.querySelector('.pc-trigger .pc-eyebrow'), null, 'Shared source reading / Historical series are redundant preview eyebrows');
    assert.equal(dom.window.document.querySelector('[data-draft-preview]:not(.draft-event-timeline) .draft-plot-legend'), null, 'Do not repeat generic Source-reported / Log scale / Unconnected labels below every numeric preview');
    assert.equal(dom.window.document.querySelectorAll('[data-source-observation]').length, 77);
  } finally { dom.window.close(); }
  const cleanup = await mount(React.createElement(Page));
  try {
    await click(document.querySelector('[data-draft-popout-trigger="metric-recording-hours"]'));
    const modal = document.querySelector('dialog[open]');
    assert.match(modal.querySelector('.draft-plot-legend').textContent, /Source-reported.*Log scale.*Unconnected observations/);
    assert.match(modal.querySelector('[data-visible-qualifications]').textContent, />50,000/);
    assert.match(modal.querySelector('[data-visible-qualifications]').textContent, />100/);
  } finally { await cleanup(); }
});
