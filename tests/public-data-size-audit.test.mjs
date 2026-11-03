import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
const plot = Object.values(METRIC_CHART_EVIDENCE).flatMap(c => c.plots).find(p => p.id === 'public-data-size');
function rendered(preview) {
  globalThis.React = React;
  return new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, {plot, preview, shareAnchor:'metric-panel-public-data-size'}))).window.document;
}
test('public-resource preview, detail and source table use plain PB', () => {
  assert.equal(plot.yLabel, 'Resource size (PB)');
  for (const preview of [true, false]) {
    const doc = rendered(preview);
    assert.match(doc.querySelector('svg').textContent, /Resource size \(PB\)/);
    assert.doesNotMatch(doc.body.textContent, /decimal PB/);
    if (!preview) assert.ok([...doc.querySelectorAll('th')].some(e => e.textContent === 'Resource size (PB)'));
  }
});

test('MaleCNS uses an exactly inventoried JPEG image pyramid with a measurement date', () => {
  const point = plot.points.find(p => p.id === 'malecns-jpeg-inventory-2026');
  assert.ok(point, 'Verified MaleCNS image product is represented');
  assert.equal(point.y, 50_910_260_068_834 / 10**15);
  assert.equal(point.x, 2026);
  assert.match(point.dateLabel, /2026-11-03.*measured/);
  assert.match(point.note, /initial.*October 2025/i);
  assert.match(point.note, /50,910,260,068,834/);
  assert.match(point.note, /27,594/);
  assert.match(point.note, /11.*resolution/);
  assert.match(point.note, /44,428,865,656,516/);
  assert.match(point.note, /segmentation.*meshes.*tables/);
  assert.equal(point.qualifier, '');
  assert.equal(plot.points.length, 6);
  const expected = {'hildebrand-zebrafish-public-images-2017':0.0027,'fafb-image-download-2018':0.012,'hemibrain-v1':0.026,'h01-2021':1.4,'microns-2025-size':1.6};
  for (const [id,y] of Object.entries(expected)) assert.equal(plot.points.find(p => p.id===id).y,y,id);
});

test('product scope and reported-versus-measured basis stay visible across chart consumers', () => {
  assert.equal(plot.observationBasis, 'Published / measured');
  assert.equal(plot.xLabel, 'Report / measurement year');
  assert.match(plot.scope, /sample size, resolution, encoding and included products/);
  assert.match(plot.scope, /1 PB = 1,000 TB/);
  assert.deepEqual([...new Set(plot.points.map(p=>p.group))].sort(), ['Measured image size','Published image sizes','Published resource sizes']);
  const male=plot.points.find(p=>p.id==='malecns-jpeg-inventory-2026');
  assert.equal(male.marker,'square');
  assert.equal(plot.points.find(p=>p.id==='h01-2021').group,'Published image sizes');
  assert.match(plot.points.find(p=>p.id==='h01-2021').note,/1.4 petabytes of images/);
  assert.match(plot.points.find(p=>p.id==='hemibrain-v1').note,/encoding.*included products.*unspecified/);
  assert.match(plot.points.find(p=>p.id==='microns-2025-size').note,/172 TB/);
  assert.match(plot.points.find(p=>p.id==='microns-2025-size').note,/July 2021/);
  for(const preview of [true,false]) {
    const doc=rendered(preview);
    for(const name of ['Published image sizes','Published resource sizes','Measured image size']) assert.match(doc.querySelector('[data-draft-group-legend]').textContent,new RegExp(name));
    assert.equal(doc.querySelectorAll('[data-source-observation]').length,6);
    if(!preview) {
      assert.match(doc.querySelector('.draft-plot-legend').textContent,/Published \/ measured/);
      assert.match(doc.querySelector('caption').textContent,/Published \/ measured/);
      assert.equal(doc.querySelectorAll('[data-point-annotation]').length,6);
    }
  }
});

test('all five historical values, dates, quotations and source identities remain exact', () => {
 const before=JSON.parse(readFileSync('tests/fixtures/public-data-size-before-20261103.json','utf8'));
 for(const old of before){const actual=plot.points.find(p=>p.id===old.id);for(const field of ['id','x','y','sourceUrl','sourceTitle','quote','dateLabel','qualifier'])assert.equal(actual[field],old[field],`${old.id}: ${field}`);}
});

test('exported dataset keys include size and the MaleCNS measurement date', () => {
 for(const p of plot.points) assert.match(p.annotation,/PB/);
 const male=plot.points.find(p=>p.id==='malecns-jpeg-inventory-2026');
 assert.match(male.annotation,/0.05091 PB.*Nov\. 3, 2026/);
 assert.match(male.sourceUrl,/docs\/public-data-size-audit\.md/);
});
