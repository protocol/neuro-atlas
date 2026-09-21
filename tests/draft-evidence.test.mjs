import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {DRAFT_CHARTS} from '../src/data/draft-charts.ts';
const file = 'src/data/draft-chart-evidence.json';
test('connectome candidate contains separately sourced neuron and synapse plots, not only prose',()=>{
 const evidence=JSON.parse(readFileSync(file,'utf8'));
 const c=evidence['Largest published connectome over time'];
 assert.equal(c.status,'plotted');
 assert.equal(c.plots.length,2);
 assert.deepEqual(c.plots.map(p=>p.points.length),[4,4]);
 assert.equal(c.plots[0].points.find(p=>p.id==='flywire-neurons').y,139255);
 assert.equal(c.plots[1].points.find(p=>p.id==='flywire-synapses').y,54500000);
});

test('draft chart evidence supplies real tissue, recording and implanted-participant observations',()=>{
 assert.ok(existsSync(file),'actual plotted evidence must exist, not only definitions');
 const evidence=JSON.parse(readFileSync(file,'utf8'));
 for(const title of ['Brain tissue mapped over time','Neural recording hours collected over time','Humans with implanted high-bandwidth BCIs over time']) {
  assert.equal(evidence[title]?.status,'plotted');
  assert.ok(evidence[title].plots.flatMap(p=>p.points).length>=5);
 }
 assert.deepEqual(Object.keys(evidence).sort(),DRAFT_CHARTS.map(x=>x.title).sort());
 // Prevent source-meaning regressions while adding the actual plot layer.
 const snapshot=JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json','utf8'));
 const tissueOriginal=snapshot.measurementSeries.find(s=>s.id==='tissue-mapped').tracks.flatMap(t=>t.points);
 const tissue=evidence['Brain tissue mapped over time'].plots.flatMap(p=>p.points);
 assert.deepEqual(tissue.map(p=>p.y),tissueOriginal.map(p=>p.value/1000));
 assert.deepEqual(tissue.map(p=>p.sourceUrl),tissueOriginal.map(p=>p.sourceUrl));
 const hours=evidence['Neural recording hours collected over time'].plots;
 assert.equal(hours.find(p=>p.id==='poyo-primate-training').points[0].qualifier,'>');
 assert.equal(hours.find(p=>p.id==='tusz-scalp-eeg').points.length,8);
 assert.equal(hours.find(p=>p.id==='tusz-scalp-eeg').points.at(-1).y,1074);
 const bci=evidence['Humans with implanted high-bandwidth BCIs over time'].plots;
 assert.deepEqual(bci.map(p=>p.id),['neuralink-cumulative','paradromics-connect-one']);
 assert.equal(bci[0].points.at(-1).y,21);
 assert.match(bci[0].points.at(-1).note,/18 of the subsequent 20/);
 assert.equal(bci[1].points[0].qualifier,'≥');
 for(const [title,item] of Object.entries(evidence)) {
  assert.ok(item.summary.length>10,title);
  if(item.status==='gap'){assert.equal(item.plots.length,0);assert.ok(item.gapReason.length>20);continue;}
  assert.ok(item.plots.length>0 || item.timeline?.events.length>0,title);
  if(item.timeline){
   assert.ok(item.timeline.scope.length>20);
   assert.equal(item.plots.length,0,'categorical events must not invent numeric impact values');
   for(const event of item.timeline.events){assert.ok(Number.isInteger(event.year));assert.ok(event.stage);assert.match(event.sourceUrl,/^https:\/\//);assert.ok(event.quote.length>20);assert.ok(event.note.length>20);assert.equal(event.y,undefined);}
  }
  for(const plot of item.plots){
   assert.ok(plot.scope.length>20);assert.ok(plot.xLabel);assert.ok(plot.yLabel);
   assert.ok(plot.points.length>0);
   assert.equal(new Set(plot.points.map(p=>p.id)).size,plot.points.length);
   for(const p of plot.points){assert.ok(Number.isFinite(p.x));assert.ok(Number.isFinite(p.y));assert.ok(p.y>=0);if(plot.scale==='log')assert.ok(p.y>0);assert.match(p.sourceUrl,/^https:\/\//);assert.ok(p.quote.length>20);assert.ok(p.dateLabel);assert.ok(p.sourceTitle);}
  }
 }
});
