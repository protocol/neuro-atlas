import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;

test('Trends preview omits the search-interest slogan while methodology remains in the expanded chart', async () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] })));
  try {
    assert.doesNotMatch(dom.window.document.body.textContent, /Search interest, not progress\./);
  } finally { dom.window.close(); }
  const cleanup = await mount(React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] }), '#google-trends-neurotech');
  try {
    assert.match(document.querySelector('dialog[open] .pc-methodology').textContent, /Public attention, not technical progress/);
  } finally { await cleanup(); }
});
