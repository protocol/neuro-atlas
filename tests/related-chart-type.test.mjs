import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
globalThis.React=React;

test('related chart paragraphs use a quiet explicit 12px type contract in the actual plot',()=>{
 const css=readFileSync(new URL('../src/components/draft-chart-plot.css',import.meta.url),'utf8');
 assert.match(css,/\.draft-plot-related\s*\{[^}]*font-size:\s*12px/,'New related-view copy needs the same small legible supporting role as chart notes');
 for(const id of ['public-data-size','recording-hours']){
  const plot=Object.values(METRIC_CHART_EVIDENCE).flatMap(e=>e.plots).find(p=>p.id===id);
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot})));
  try {
   const link=dom.window.document.querySelector('[data-related-chart], [data-related-bci-participants]');
   assert.ok(link,'Existing related measurement remains reachable');
   assert.ok(link.closest('p').classList.contains('draft-plot-related'),'Both linked contexts use the explicit supporting-text role');
   assert.match(link.getAttribute('href'),/^#/);
  } finally {dom.window.close();}
 }
});
