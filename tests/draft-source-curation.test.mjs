import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const evidence=JSON.parse(readFileSync('src/data/draft-chart-evidence.json','utf8'));
const plot=id=>Object.values(evidence).flatMap(c=>c.plots).find(p=>p.id===id);
test('tissue release annotations preserve coordinates and neuronal targets remain partial',()=>{
 const tissue=plot('tissue-cm3').points;
 for(const [id,x,pattern] of [['h01-human-imaged-2021-06-01',2021.4136986301369,/H01.*human.*≈1 mm³.*Jun 2021/],['microns-mouse-imaged-2021-07-01',2021.495890410959,/MICrONS.*mouse.*≈1 mm³.*Jul 2021/]]){
  const p=tissue.find(p=>p.id===id); assert.equal(p.x,x); assert.equal(p.y,0.001); assert.match(p.annotation??'',pattern);
 }
 const neurons=plot('largest-connectome-neurons');
 const p=neurons.points.find(p=>p.id==='lee-reid-2016-neuronal-targets');
 assert.ok(p); assert.equal(p.x,2016); assert.equal(p.y,1278); assert.equal(p.group,'Partial mouse cortex');
 assert.match(p.note,/boundary-truncated/); assert.match(p.dateLabel,/publication/);
 assert.match(neurons.scope,/not spatial complexity/); assert.match(neurons.scope,/not comparable complete maps/);
});

test('acquisition economics uses nine approximate Table A1 values, excludes unresolved rows and preserves raw archive',()=>{
 const p=plot('acquisition-economics'); assert.ok(p,'acquisition-economics plot must exist');
 const expected=[['exm2015',2015,1e9],['sem2018',2018,1e8],['exllsm2019',2019,1e9],['exaspim2023',2023,1e10],['multisem506',2023,1e9],['multisem706',2025,1e9],['mesospim2024',2024,1e9],['peem2024',2024,2e10],['bdtem2024',2024,6.5e9]];
 assert.deepEqual(p.points.map(p=>[p.id,p.x,p.y]),expected.map(([id,x,value])=>[id,x,1/value]));
 assert.ok(p.points.every(p=>p.qualifier==='≈'));
 assert.equal(p.points.find(p=>p.id==='peem2024').group,'PEEM · prospective');
 assert.deepEqual([...new Set(p.points.map(p=>p.group))].sort(),['Electron microscopy','Optical','PEEM · prospective']);
 assert.match(p.scope,/rough author estimates/i); assert.match(p.seriesNote,/Table A1.*Figure 2/);
 assert.equal(plot('acquisition-rates').points.length,2);
 const raw=JSON.parse(readFileSync('docs/data/acquisition-economics-table-a1.json','utf8'));
 assert.equal(raw.rows.length,11); assert.ok(raw.rows.some(p=>p.id==='exaspim2024')); assert.ok(raw.rows.some(p=>p.id==='xray2024'));
});

test('RoboEM preserves exact workbook coordinates and full point notes while retaining nERL',()=>{
 const expected=JSON.parse(readFileSync('tests/fixtures/roboem-figure2-values.json','utf8'));
 for(const source of expected){
  const p=plot('connectomics-roboem-human-split-merge'); assert.ok(p,'combined RoboEM plot must exist');
  assert.equal(p.xKind,'number'); assert.equal(p.scale,'linear'); assert.match(p.xLabel,/Split/); assert.match(p.yLabel,/Merge/);
  assert.deepEqual(p.points.filter(point=>source.points.some(s=>s.id===point.id)).map(({id,x,y,quote,note})=>({id,x,y,quote,note})),source.points);
  assert.ok(p.seriesNote.length<450); assert.match(p.seriesNote,/not.*species effect/);
 }
 assert.equal(plot('pathfinder-nerl').points[0].y,94.2);
 assert.match(evidence['Automated reconstruction accuracy over time'].summary,/ConnectomeBench2.*ROC.*not errors\/mm/);
});
test('proofreading scope distinguishes incomplete axons and incompatible NeuVue versions without a new numeric point',()=>{
 const c=evidence['Human proofreading burden over time'];
 assert.deepEqual(c.plots[0].points.map(p=>[p.id,p.y]),[['hemibrain-proofreading',50],['flywire-proofreading',33]]);
 assert.match(c.summary,/1,433.*84,035.*1.7%.*varying/);
 assert.match(c.gapReason,/2,451.*3,740.*3,600/);
 assert.match(c.gapReason,/matched.*labor/); assert.match(c.plots[0].seriesNote,/not.*completed neurons/);
});

test('all candidate definitions, evidence gaps and additive share targets remain intact',async()=>{
 const {DRAFT_CHART_LINKS}=await import('../src/data/draft-chart-links.ts');
 const expected=JSON.parse(readFileSync('tests/fixtures/draft-chart-links.json','utf8'));
 assert.deepEqual(DRAFT_CHART_LINKS,expected);
 assert.equal(Object.keys(evidence).length,19);
 assert.equal(Object.values(evidence).filter(c=>c.status==='gap').length,5);
 assert.equal(Object.values(evidence).flatMap(c=>c.plots).length,23);
 assert.equal(Object.values(evidence).flatMap(c=>c.plots).flatMap(p=>p.points).length,85);
});

test('browser source-table probe derives its exact row count from current neuronal data',async()=>{
 const {spawnSync}=await import('node:child_process');
 const result=spawnSync('python3',['-c',`
import json
from pathlib import Path
DATA=json.loads(Path('src/data/draft-chart-evidence.json').read_text())
line=next(s.strip() for s in Path('scripts/qa/draft-charts-browser.py').read_text().splitlines() if 'querySelectorAll("tbody tr")' in s)
summary='probe'; count=5
val=lambda _: count
exec(line)
count=4
try: exec(line)
except AssertionError: pass
else: raise AssertionError('stale four-row source table must fail')
`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
