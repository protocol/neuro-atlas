import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';
globalThis.React=React;
for(const id of ['public-data-size','acquisition-economics','largest-connectome-neurons'])test(`${id}: exported chart visibly identifies every observation and date without a prose footnote`,async()=>{
 const plot=Object.values(METRIC_CHART_EVIDENCE).flatMap(e=>e.plots).find(p=>p.id===id);
 const snapshots=[],original=URL.createObjectURL;
 const cleanup=await mount(React.createElement(DraftChartPlot,{plot,shareAnchor:'metric-panel-'+id}));
 try {
  URL.createObjectURL=blob=>{snapshots.push(blob);return 'blob:point-key-test';};
  const liveSVG=document.querySelector('figure > svg').outerHTML;
  await click(document.querySelector('[data-download-chart]'));
  assert.equal(snapshots.length,1);
  const doc=new window.DOMParser().parseFromString(await snapshots[0].text(),'image/svg+xml');
  const visible=[...doc.querySelectorAll('text')].map(n=>n.textContent).join(' ');
  for(const point of plot.points){
   assert.ok(visible.includes(point.label),`Visible source identity: ${point.id}`);
   assert.ok(visible.includes(point.qualifier+point.y.toLocaleString('en-US',{maximumSignificantDigits:6})),`Visible qualified value: ${point.id}`);
   assert.ok(visible.includes(point.dateLabel),`Visible date/product basis: ${point.id}`);
  }
  if(id==='largest-connectome-neurons')assert.match(visible,/excitatory neuronal targets.*boundary-truncated/);
  assert.match(visible,/More information on Neuro Atlas/);
  assert.ok(!visible.includes(plot.scope),'Long scope prose stays in on-site methodology/nonvisual evidence');
  assert.equal(document.querySelector('figure > svg').outerHTML,liveSVG,'Export keys never mutate live plot geometry');
 } finally {URL.createObjectURL=original;await cleanup();}
});
