import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {DraftChartsSection} from '../src/components/sections/draft-charts-section.tsx';
const data=JSON.parse(readFileSync('src/data/draft-chart-evidence.json','utf8'));
const plots=Object.values(data).flatMap(c=>c.plots);
test('acquisition economics shows the reciprocal of each published efficiency, not all-in cost',()=>{
 const p=plots.find(p=>p.id==='acquisition-economics');
 assert.match(p.yLabel,/\$\/voxel/);
 const expected=[['exm2015',1e9],['sem2018',1e8],['exllsm2019',1e9],['exaspim2023',1e10],['multisem506',1e9],['multisem706',1e9],['mesospim2024',1e9],['peem2024',2e10],['bdtem2024',6.5e9]];
 for(const [id,v] of expected){const q=p.points.find(q=>q.id===id);assert.equal(q.y,1/v);assert.equal(q.qualifier,'≈');assert.equal(q.color,q.group==='Optical'?'#9275ca':'#cd732f');assert.match(q.note,/reciprocal/i);}
 assert.match(p.scope,/not.*all-in/i);
});
test('one combined species-colored split/merge plot retains every exact workbook row without regression lines',()=>{
 const source=JSON.parse(readFileSync('tests/fixtures/roboem-figure2-values.json','utf8')).flatMap(p=>p.points);
 const c=data['Automated reconstruction accuracy over time'];
 const p=c.plots.find(p=>p.id==='connectomics-roboem-human-split-merge');
 assert.equal(p.points.length,12);assert.equal(c.plots.length,2);
 for(const q of source){const actual=p.points.find(x=>x.id===q.id);assert.ok(actual);for(const key of ['x','y','quote','note'])assert.deepEqual(actual[key],q[key]);}
 assert.deepEqual([...new Set(p.points.map(q=>q.color))].sort(),['#3b8b62','#9275ca']);
 assert.deepEqual([...new Set(p.points.map(q=>q.marker))].sort(),['circle','square','triangle']);
 assert.match(p.seriesNote,/not.*species effect/i);
});

test('combined error plot keeps both old panel URLs without duplicating observations',()=>{
 globalThis.React=React;const dom=new JSDOM(renderToStaticMarkup(React.createElement(DraftChartsSection)));
 for(const prefix of ['draft','metric']) assert.ok(dom.window.document.getElementById(`${prefix}-panel-connectomics-roboem-mouse-split-merge`));
 assert.equal(dom.window.document.querySelectorAll('[data-source-observation^="roboem-"]').length,12);dom.window.close();
});


test('new human observations retain cohort, modality, access and bound distinctions',()=>{
 const chronic=plots.find(p=>p.id==='neuralink-cumulative');
 assert.equal(chronic.points.length,7);
 const bg=chronic.points.find(p=>p.id==='braingate-documented-cohort-2023-01-13');
 assert.equal(bg.y,14);assert.match(bg.note,/2004.*2021/);assert.match(bg.sourceUrl,/PMC10074470/);
 const precision=plots.find(p=>p.id==='precision-temporary-recording');
 assert.deepEqual(precision.points.map(p=>[p.y,p.qualifier]),[[37,''],[50,'>']]);
 assert.match(precision.scope,/temporary|Temporary/);assert.match(precision.scope,/mixed CNS/);
 assert.ok(!precision.points.some(p=>p.y===100));
 const hours=plots.find(p=>p.id==='neuralink-private-intracortical-hours');
 assert.deepEqual(hours.points.map(p=>[p.y,p.qualifier]),[[50000,'>']]);
 assert.match(hours.title,/company-held/);assert.match(hours.scope,/not.*public|Not.*public/);assert.match(hours.scope,/participant-specific/);
 assert.ok(plots.find(p=>p.id==='tusz-scalp-eeg').title.includes('scalp EEG'));
});

test('public image additions are separately named byte products, not FlyWire duplicate acquisition',()=>{
 const p=plots.find(p=>p.id==='public-data-size');assert.equal(p.points.length,5);assert.equal(p.scale,'log');
 const fafb=p.points.find(p=>p.id==='fafb-image-download-2018');assert.equal(fafb.y,0.012);assert.equal(fafb.x,2018);assert.match(fafb.label,/FlyWire/);
 const fish=p.points.find(p=>p.id==='hildebrand-zebrafish-public-images-2017');assert.equal(fish.y,0.0027);assert.equal(fish.x,2017);assert.match(fish.label,/Hildebrand/);
 assert.match(p.scope,/not a cumulative/);assert.match(p.scope,/Fish1/);
});


test('all 79 pre-review source identities, dates, citations and exact values survive except the explicit reciprocal display',()=>{
 const before=JSON.parse(readFileSync('tests/fixtures/observations-before-20261023.json','utf8'));
 const now=plots.flatMap(p=>p.points);assert.equal(before.length,79);
 for(const old of before){const q=now.find(p=>p.id===old.id);assert.ok(q,old.id);assert.equal(q.x,old.x,old.id);assert.equal(q.y,old.plotId==='acquisition-economics'?1/old.y:old.y,old.id);assert.equal(q.sourceUrl,old.sourceUrl,old.id);assert.equal(q.quote,old.quote,old.id);}
});
