import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
test('a verified calculation reference is labeled separately from an unconfirmed study assignment', () => {
  const plot = { id:'method-fixture', title:'Synthetic method fixture', xLabel:'Year', yLabel:'Rate', scale:'log', scope:'Renderer fixture only.', points:[{ id:'method',x:2021,y:6.18,label:'Synthetic derived point',dateLabel:'2021',sourceTitle:'Paper',quote:'Paper input.',calculationSource:{title:'Author technical report',url:'https://example.org/method'} }] };
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot})));
  try {
    assert.equal(dom.window.document.querySelector('[data-calculation-source] a')?.href,'https://example.org/method');
    assert.match(dom.window.document.querySelector('[data-calculation-source]').textContent,/Calculation source/);
    assert.equal(dom.window.document.querySelector('[data-candidate-sources]'),null);
  } finally { dom.window.close(); }
});
