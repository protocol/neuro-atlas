import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {DraftChartPlot} from '../src/components/draft-chart-plot.tsx';
import {METRIC_CHART_EVIDENCE} from '../src/data/metric-chart-visibility.ts';
import {mount,click} from './modal-helpers.mjs';
import {brainScaleClock} from './brain-scale-helpers.mjs';
import {DraftChartPanel} from '../src/components/draft-chart-panel.tsx';
import {whenChartRegistered} from '../src/lib/chart-export-api.ts';
import {buildChartImage} from '../src/lib/chart-export.ts';
import {DRAFT_CHART_EVIDENCE} from '../src/data/draft-chart-observations.ts';
import {acquisitionNumber,acquisitionAxisTick,supportsAcquisitionMetrics} from '../src/lib/acquisition-metric.ts';
globalThis.React=React;
const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
const modes=[
  ['voxels-per-dollar','Voxels per $','Approx. voxels/$ (log)',y=>y],
  ['dollars-per-voxel','$ per voxel','Approx. $ per voxel (log)',y=>1/y],
];
const select=mode=>click(document.querySelector(`[data-acquisition-metric="${mode}"]`));
const selectedValue=id=>Number(document.querySelector(`[data-source-observation="${id}"]`).getAttribute('data-acquisition-value'));
const centers=()=>[...document.querySelectorAll('[data-source-observation]')].map(mark=>mark.localName==='circle'
  ? Number(mark.getAttribute('cx')) : mark.getAttribute('points').split(' ').map(p=>Number(p.split(',')[0])).reduce((a,b)=>a+b)/mark.getAttribute('points').split(' ').length);

test('two quantity buttons default to historical voxels per dollar and retain all observations and exact x geometry',async()=>{
  const before=JSON.stringify(plot);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    const buttons=[...document.querySelectorAll('[data-acquisition-metric]')];
    assert.equal(buttons.length,2,'two historical quantity choices');
    assert.equal(document.querySelector('[aria-pressed="true"]').textContent,'Voxels per $');
    assert.equal(document.querySelectorAll('[data-source-observation]').length,10);
    const xs=centers();
    for(const [i,point] of plot.points.entries()) assert.ok(Math.abs(xs[i]-(46+(point.x-2015)/10*490))<1e-9,'original 2015–2025 x geometry at 560px');
    const xTicks=[...document.querySelectorAll('svg [data-year-guide]')].map(n=>[n.dataset.yearGuide,n.getAttribute('x1')]);
    assert.equal(xTicks.length,11);
    for(const [mode,label,title,convert] of modes){
      await select(mode);
      assert.equal(document.querySelector('[aria-pressed="true"]').textContent,label);
      assert.equal(document.querySelector('svg .draft-plot-axis-title').textContent,title);
      for(const point of plot.points) assert.equal(selectedValue(point.id),convert(point.y),point.id);
      assert.deepEqual(centers(),xs,'x positions unchanged by metric');
      assert.deepEqual([...document.querySelectorAll('svg [data-year-guide]')].map(n=>[n.dataset.yearGuide,n.getAttribute('x1')]),xTicks);
      assert.ok(Number(document.querySelector('[data-source-observation="exaspim2024"]').getAttribute('cy')) < Number(document.querySelector('[data-source-observation="sem2018"]').getAttribute('cy')),'higher efficiency / cheaper is always at the top');
      assert.equal(document.querySelector('[data-cheaper-direction]')?.textContent,mode==='voxels-per-dollar'?undefined:'↑ cheaper');
    }
    assert.equal(JSON.stringify(plot),before,'no source object mutation');
  }finally{await cleanup();}
});

test('the compact preview is always historical efficiency with one short fit-label row and full source observations',async()=>{
  const clock=brainScaleClock(true,255);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot,preview:true}),'',clock.configure);
  try{
    const svg=document.querySelector('figure > svg');
    assert.equal(svg.querySelector('.draft-plot-axis-title').textContent,'≈ voxels/$ · log');
    assert.equal(document.querySelector('[data-acquisition-metric]'),null);
    assert.equal(document.querySelector('[data-brain-scale-toggle]'),null);
    assert.equal(svg.querySelectorAll('[data-source-observation]').length,10);
    assert.equal(Number(svg.querySelector('[data-source-observation="exaspim2024"]').dataset.acquisitionValue),1e11);
    const rates=[...svg.querySelectorAll('[data-fit-direct-label]')];
    assert.equal(rates.length,2);
    assert.equal(rates[0].getAttribute('y'),rates[1].getAttribute('y'),'one compact rate row, not two long headers');
    for(const rate of rates) assert.ok(rate.textContent.length<=14);
    assert.deepEqual([...svg.querySelectorAll('[data-year-guide]')].map(n=>Number(n.dataset.yearGuide)),Array.from({length:11},(_,i)=>2015+i));
    assert.doesNotMatch(document.querySelector('figure').textContent,/crossing|forecast|extrapolation|per human brain/i);
  }finally{await cleanup();delete globalThis.ResizeObserver;}
});

test('one default-off human-brain $1B reference is available only in voxels per dollar',async()=>{
  const clock=brainScaleClock(true);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}),'',clock.configure);
  try{
    const toggle=document.querySelector('[data-brain-scale-toggle]');
    assert.match(toggle.textContent,/Human-brain reference \(\$1B\)/);
    assert.ok(document.querySelector('.acquisition-metric-controls').contains(toggle));
    assert.equal(toggle.getAttribute('aria-checked'),'false');
    await click(toggle);
    const lines=[...document.querySelectorAll('[data-brain-scale-reference]')];
    assert.equal(lines.length,1,'one scenario, not a budget ladder');
    assert.equal(Number(lines[0].dataset.value),1.875e12);
    assert.equal(lines[0].parentElement.getAttribute('opacity'),'1');
    assert.match(lines[0].parentElement.textContent,/\$1B.*1\.88T/);
    const text=document.querySelector('[data-brain-scale-assumptions]').textContent;
    assert.match(text,/1\.875×10²¹ voxels \(~1\.9 sextillion\)/);
    assert.match(text,/1,200,000 mm³.*4×4×40 nm/);
    assert.doesNotMatch(text,/\$100M|\$10M|\$1M|\$100K/);
    await select('dollars-per-voxel');
    assert.equal(document.querySelectorAll('[data-brain-scale-reference]').length,0);
    assert.equal(document.querySelector('[data-brain-scale-toggle]'),null);
    assert.ok(document.querySelector('.acquisition-reference-unavailable')===null,'no redundant availability notice in the reciprocal view');
    assert.doesNotMatch(document.querySelector('.acquisition-metric-controls').textContent,/human.brain|reference|only available/i);
    await select('voxels-per-dollar');
    assert.equal(document.querySelector('[data-brain-scale-toggle]').getAttribute('aria-checked'),'false','the reference control returns only in the efficiency view, still off');
  }finally{await cleanup();}
});


test('separate historical rate fits never become a crossing forecast in either quantity',async()=>{
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    for(const [mode] of modes){
      await select(mode);
      for(const line of document.querySelectorAll('[data-fit-direct-label]')) assert.match(line.textContent,mode==='voxels-per-dollar'?/2×\/1\.5y/:/cost halves every 1\.5y/);
      assert.equal(document.querySelectorAll('[data-acquisition-extrapolation], [data-acquisition-crossing]').length,0);
      assert.match(document.querySelector('[data-acquisition-scope]')?.textContent ?? '',/Historical acquisition-efficiency estimates/);
      assert.match(document.querySelector('[data-acquisition-scope]')?.textContent ?? '',/resolution, scope and cost definition/);
      assert.equal(document.querySelectorAll('[data-reference-trendline]').length,2);
      for(const line of document.querySelectorAll('[data-reference-trendline]')) assert.equal(line.getAttribute('stroke-dasharray'),null);
    }
  }finally{await cleanup();}
});


test('pinned and focused source popups survive rendering in all modes and always contain all three quantities plus year and qualifications',async()=>{
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    for(const [mode] of modes){
      await select(mode);
      const mark=document.querySelector('[data-source-observation="exaspim2024"]');
      await act(async()=>mark.focus());
      assert.ok(document.querySelector('[data-point-tooltip]'),'focus opens a stable popup');
      await act(async()=>mark.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
      const popup=document.querySelector('[data-point-tooltip]');
      assert.ok(popup,'pin opens a stable popup');
      assert.equal(popup.querySelectorAll('[data-acquisition-tooltip-value]').length,3);
      assert.match(popup.textContent,/100 billion voxels\/\$/);
      assert.match(popup.textContent,/\$1×10⁻¹¹ per voxel/);
      assert.match(popup.textContent,/\$18\.75B per human brain/);
      assert.match(popup.textContent,/Illustrative human-brain acquisition cost/);
      assert.match(popup.textContent,/1\.875×10²¹ voxels.*4×4×40 nm.*1,200,000 mm³/);
      assert.match(popup.textContent,/source-estimated voxels per dollar/i);
      assert.match(popup.textContent,/Preparation, reconstruction, proofreading and storage costs remain additional/);
      assert.match(popup.textContent,/Optical and EM estimates use different scopes and resolutions/);
      assert.match(popup.textContent,/2024/);
      assert.match(popup.textContent,/author estimate/i);
      assert.match(popup.textContent,/author estimate.*Glaser.*2025/i);
      assert.ok(popup.querySelector('a[href]'),'source link retained');
      const button=document.querySelector(`[data-acquisition-metric="${mode==='voxels-per-dollar'?'dollars-per-voxel':'voxels-per-dollar'}"]`);
      await act(async()=>button.focus());await click(button);
      assert.equal(document.querySelector('[data-point-tooltip]'),null);
      assert.equal(document.activeElement,button,'changing units never steals control focus');
    }
    await act(async()=>document.querySelector('[data-source-observation="peem2024"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    assert.match(document.querySelector('[data-point-tooltip]').textContent,/prospective/i);
  }finally{await cleanup();}
});


test('selected image and JSON describe only the selected quantity while source table and download retain original units',async()=>{
  const anchor='metric-panel-acquisition-economics';
  const cleanup=await mount(React.createElement(DraftChartPanel,{plot,anchor}),'#'+anchor);
  try{
    assert.equal(document.querySelector('dialog h2').textContent,'Estimated acquisition efficiency');
    for(const [mode,label,title,convert] of modes){
      await select(mode);
      const selected=(await whenChartRegistered(anchor,0)).getChart();
      assert.ok(selected.title.includes(label));
      for(const key of selected.pointKey) assert.ok(key.label.includes(mode==='voxels-per-dollar'?'vox/$':'per voxel'));
      const image=buildChartImage(selected,window.location.href);
      const doc=new JSDOM(image.svg,{contentType:'image/svg+xml'}).window.document;
      assert.ok(doc.documentElement.textContent.includes(title));
      assert.doesNotMatch(doc.documentElement.textContent,/crossing|dashed continuation|\$100M|\$10M|\$1M|\$100K/);
      assert.equal(doc.querySelectorAll('[data-acquisition-extrapolation]').length,0);
      doc.defaultView.close();
      const data=JSON.parse(decodeURIComponent(document.querySelector('dialog [data-selected-plot-json]').getAttribute('href').split(',')[1]));
      assert.equal(data.acquisitionView.metric,mode);
      assert.equal(data.acquisitionView.unit,mode==='voxels-per-dollar'?'voxels/$':'$ per voxel');
      assert.equal(data.acquisitionView.fitBasis,'voxels/$');
      assert.equal('humanImageVoxels' in data.acquisitionView,false,'no orphaned human-axis metadata');
      assert.ok(data.acquisitionView.transformation.includes('efficiency'));
      for(const [i,line] of data.referenceTrendlines.entries()){
        assert.deepEqual(line.fit,plot.referenceTrendlines[i].fit);
        assert.match(line.note,/fit diagnostics.*original voxels\/\$/i);
        assert.doesNotMatch(line.note,/crossing|dashed continuation/);
        for(const [j,point] of line.points.entries()) assert.equal(point.y,convert(plot.referenceTrendlines[i].points[j].y));
      }
      assert.equal(data.points[9].y,convert(1e11));
      assert.match(data.points[9].note,/author estimate.*Glaser.*2025/i);
      const table=document.querySelector('dialog table');
      assert.equal(table.querySelectorAll('thead th')[2].textContent,plot.yLabel,'table stays in source units');
      assert.equal(table.querySelectorAll('tbody tr')[9].querySelectorAll('td')[1].textContent,'≈100 billion');
      const sourceLink=document.querySelector('dialog [data-source-plot-json]');
      assert.ok(sourceLink,'source download remains distinct from selected quantity');
      const source=JSON.parse(decodeURIComponent(sourceLink.getAttribute('href').split(',')[1]));
      assert.deepEqual(source,plot,'original values, units, sources and fits');
    }
  }finally{await cleanup();}
});


test('cost ticks use compact precision and SI dollars to fit the unchanged efficiency margin',async()=>{
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    assert.deepEqual([...document.querySelectorAll('[data-acquisition-y-tick]')].map(n=>n.textContent),['100M','1B','10B','100B']);
    await select('dollars-per-voxel');
    assert.equal(Number(document.querySelector('[data-acquisition-y-tick]').getAttribute('x')),38,'cost labels gain two pixels without moving the axis/points');
    assert.deepEqual([...document.querySelectorAll('[data-acquisition-y-tick]')].map(n=>n.textContent),['10 n$','1 n$','0.1 n$','10 p$']);
    assert.match(document.querySelector('figure').textContent,/SI dollar ticks: n\$ = nanodollars/);
    assert.doesNotMatch(document.querySelector('figure').textContent,/M = million/);
  }finally{await cleanup();}
});


test('the archived $/voxel plot and unrelated plots are not interpreted as canonical efficiency',()=>{
  const archived=DRAFT_CHART_EVIDENCE['Connectomics imaging throughput over time'].plots.find(p=>p.id==='acquisition-economics');
  const before=JSON.stringify(archived);
  assert.equal(supportsAcquisitionMetrics(archived),false);
  assert.equal(supportsAcquisitionMetrics({...plot,id:'another-chart'}),false);
  for(const preview of [true,false]){
    const doc=new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot:archived,preview}))).window.document;
    assert.equal(doc.querySelector('[data-acquisition-metric]'),null);
    assert.equal(doc.querySelector('[data-acquisition-value]'),null);
    assert.equal(doc.querySelector('[data-cheaper-direction]'),null);
    assert.equal(doc.querySelectorAll('[data-source-observation]').length,9);
    doc.defaultView.close();
  }
  assert.equal(JSON.stringify(archived),before);
});

test('scoped formatting caps dollar precision and uses scientific above quadrillion without changing the shared formatter',()=>{
  for(const [value,label] of [[1.2e12,'$1.2T'],[85e9,'$85B'],[940e6,'$940M'],[18750000000,'$18.75B'],[1.234567e12,'$1.235T'],[1e15,'$1Q'],[1.875e16,'$1.875×10¹⁶']]) assert.equal(acquisitionNumber(value,'human-brain'),label);
  assert.equal(acquisitionNumber(1e-11,'dollars-per-voxel'),'$1×10⁻¹¹');
  assert.equal(acquisitionAxisTick(1e-15,'dollars-per-voxel'),'1 f$');
  assert.equal(acquisitionAxisTick(1e-18,'dollars-per-voxel'),'1 a$');
  assert.equal(acquisitionAxisTick(1e17,'voxels-per-dollar'),'1e17');
});
