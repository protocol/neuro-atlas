import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {beforeScientificCopy} from './helpers/sitewide-copy-scientific.mjs';
import {DraftChartPlotBeforeAxisCopy} from './helpers/sitewide-copy-svg.mjs';
const frozen=JSON.parse(readFileSync(new URL('./fixtures/bci-sensory-default-svg.json',import.meta.url),'utf8'));
const plot=Object.values(beforeScientificCopy(METRIC_CHART_EVIDENCE)).flatMap(x=>x.plots??[]).find(x=>x.id==='neuroai-imagenet');
const svg=(component,plot,preview)=>renderToStaticMarkup(React.createElement(component,{plot,preview})).match(/<svg[^>]*class="draft-plot-svg"[\s\S]*?<\/svg>/)[0];
const hash=text=>createHash('sha256').update(text).digest('hex');
for(const preview of [false,true])test(`NeuroAI historical axis-copy projection preserves the original SVG golden and every observation (preview=${preview})`,()=>{
 const historic=svg(DraftChartPlotBeforeAxisCopy,plot,preview);
 assert.equal(hash(historic),frozen[`neuroai-imagenet:${preview?'preview':'default'}`]);
 const current=new JSDOM(svg(DraftChartPlot,plot,preview),{contentType:'image/svg+xml'});
 const old=new JSDOM(historic,{contentType:'image/svg+xml'});
 try {
  const marks=doc=>[...doc.querySelectorAll('[data-source-observation]')].map(e=>Object.fromEntries([...e.attributes].map(a=>[a.name,a.value])));
  assert.deepEqual(marks(current.window.document),marks(old.window.document),'Copy projection preserves actual mark geometry, identities, values and qualifiers');
  assert.match(current.window.document.documentElement.textContent,/unobserved 6–40 mJ\/image/);
  assert.match(old.window.document.documentElement.textContent,/6–40 mJ\/image omitted \(no observations\)/);
 } finally {current.window.close();old.window.close();}
 const mutated=structuredClone(plot);mutated.points[0].y+=1;
 assert.notEqual(hash(svg(DraftChartPlotBeforeAxisCopy,mutated,preview)),frozen[`neuroai-imagenet:${preview?'preview':'default'}`],'An unlisted scientific-value mutation still fails the unchanged original full SVG golden');
});
