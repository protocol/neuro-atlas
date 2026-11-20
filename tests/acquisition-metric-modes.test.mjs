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
import {acquisitionNumber,acquisitionAxisTick,acquisitionBillionCrossing,supportsAcquisitionMetrics} from '../src/lib/acquisition-metric.ts';
globalThis.React=React;
const plot=METRIC_CHART_EVIDENCE['Connectomics imaging cost efficiency'].plots[0];
const modes=[
  ['human-brain','$ per human brain','Approx. $ to image one human brain (log)',y=>1.875e21/y],
  ['voxels-per-dollar','Voxels per $','Approx. voxels/$ (log)',y=>y],
  ['dollars-per-voxel','$ per voxel','Approx. $ per voxel (log)',y=>1/y],
];
const select=mode=>click(document.querySelector(`[data-acquisition-metric="${mode}"]`));
const selectedValue=id=>Number(document.querySelector(`[data-source-observation="${id}"]`).getAttribute('data-acquisition-value'));
const centers=()=>[...document.querySelectorAll('[data-source-observation]')].map(mark=>mark.localName==='circle'
  ? Number(mark.getAttribute('cx')) : mark.getAttribute('points').split(' ').map(p=>Number(p.split(',')[0])).reduce((a,b)=>a+b)/mark.getAttribute('points').split(' ').length);

test('three metric buttons default to human-brain cost, project the same observations on inverted log cost axes, and retain exact x geometry',async()=>{
  const before=JSON.stringify(plot);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    const buttons=[...document.querySelectorAll('[data-acquisition-metric]')];
    assert.equal(buttons.length,3,'three metric choices');
    assert.equal(document.querySelector('[aria-pressed="true"]').textContent,'$ per human brain');
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

test('the unopened acquisition preview uses the same human-brain default without interactive controls',()=>{
  const doc=new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot,{plot,preview:true}))).window.document;
  assert.equal(doc.querySelector('svg .draft-plot-axis-title').textContent,'Approx. $ to image one human brain (log)');
  assert.equal(doc.querySelector('[data-acquisition-metric]'),null);
  assert.equal(doc.querySelector('[data-acquisition-crossing]'),null,'long crossing-year explanations are modal-only');
  assert.equal(doc.querySelector('[data-acquisition-preview-extrapolation]')?.textContent,'Dashed: extrapolation');
  assert.equal(Number(doc.querySelector('[data-source-observation="exaspim2024"]').getAttribute('data-acquisition-value')),18_750_000_000);
  doc.defaultView.close();
});

test('the existing default-off targets sit beside metric controls above the chart and convert budget thresholds in every mode',async()=>{
  const clock=brainScaleClock(true);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}),'',clock.configure);
  try{
    const toggle=document.querySelector('[data-brain-scale-toggle]');
    const controls=document.querySelector('.acquisition-metric-controls');
    assert.ok(controls.contains(toggle),'target toggle belongs to the above-chart control row');
    assert.ok(controls.compareDocumentPosition(document.querySelector('figure > svg')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(toggle.getAttribute('aria-checked'),'false');
    await click(toggle);
    const xs=centers();
    for(const [mode,,,convert] of modes){
      await select(mode);
      const lines=[...document.querySelectorAll('[data-brain-scale-reference]')];
      assert.equal(lines.length,5);
      for(const [i,budget] of [1e9,1e8,1e7,1e6,1e5].entries()){
        const expected=mode==='human-brain'?budget:convert(1.875e21/budget);
        assert.ok(Math.abs(Number(lines[i].dataset.value)/expected-1)<1e-14);
        assert.equal(lines[i].parentElement.getAttribute('opacity'),'1','every target is on-chart');
      }
      const labels=lines.map(line=>line.parentElement.querySelector('text').textContent);
      if(mode==='human-brain') assert.deepEqual(labels,['$1B','$100M','$10M','$1M','$100K']);
      if(mode==='voxels-per-dollar') assert.equal(labels[0],'$1B · 1.88T');
      if(mode==='dollars-per-voxel') for(const label of labels) assert.doesNotMatch(label,/\$[\d.]+[MBTQ]/,'per-voxel labels are scientific, not dollar budgets');
      assert.deepEqual(centers(),xs);
    }
  }finally{await cleanup();}
});


test('cost fit labels retain the separate measured rates and human-brain mode extrapolates only to the unchanged 2025 edge',async()=>{
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    for(const [mode] of modes){
      await select(mode);
      for(const line of document.querySelectorAll('[data-fit-direct-label]')) assert.match(line.textContent,mode==='voxels-per-dollar'?/2×\/1\.5y/:/cost halves every 1\.5y/);
      const extrapolations=[...document.querySelectorAll('[data-acquisition-extrapolation]')];
      const crossings=[...document.querySelectorAll('[data-acquisition-crossing]')];
      if(mode!=='human-brain'){assert.equal(extrapolations.length,0);assert.equal(crossings.length,0);continue;}
      assert.equal(extrapolations.length,1,'only expansion ends before the displayed edge');
      assert.equal(extrapolations[0].dataset.acquisitionExtrapolation,'expansion');
      assert.equal(extrapolations[0].getAttribute('stroke-dasharray'),'5 4');
      const endX=Number(extrapolations[0].getAttribute('points').split(' ').at(-1).split(',')[0]);
      assert.equal(endX,Number(document.querySelector('[data-source-observation="multisem706"]').getAttribute('cx')),'extension stops exactly at 2025');
      assert.equal(crossings.length,2);
      for(const [i,year] of [2032.741933127535,2039.3328704849728].entries()){
        assert.ok(Math.abs(Number(crossings[i].dataset.crossingYear)-year)<1e-9);
        assert.match(crossings[i].textContent,/\$1B.*extrapolation.*beyond displayed range/i);
        assert.ok(crossings[i].textContent.includes(year.toFixed(1)));
      }
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
      assert.match(popup.textContent,/2024/);
      assert.match(popup.textContent,/author estimate/i);
      assert.match(popup.textContent,/citation mismatch.*HiExM/i);
      assert.ok(popup.querySelector('a[href]'),'source link retained');
      const button=document.querySelector(`[data-acquisition-metric="${mode==='human-brain'?'voxels-per-dollar':'human-brain'}"]`);
      await act(async()=>button.focus());await click(button);
      assert.equal(document.querySelector('[data-point-tooltip]'),null);
      assert.equal(document.activeElement,button,'changing units never steals control focus');
    }
    await act(async()=>document.querySelector('[data-source-observation="peem2024"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    assert.match(document.querySelector('[data-point-tooltip]').textContent,/prospective/i);
  }finally{await cleanup();}
});


test('acquisition assumptions use the readable human voxel count and exact acquisition-only cost explanation',async()=>{
  const clock=brainScaleClock(true);
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}),'',clock.configure);
  try{
    const text=document.querySelector('[data-brain-scale-assumptions]').textContent;
    assert.match(text,/1\.875×10²¹ voxels \(~1\.9 sextillion\)/);
    assert.ok(document.querySelector('figure').textContent.includes('Cost per human brain = 1.875×10²¹ voxels ÷ demonstrated voxels per dollar. Image acquisition only; excludes preparation, reconstruction, proofreading and storage, which have historically dominated total cost.'));
    await select('voxels-per-dollar');await click(document.querySelector('[data-brain-scale-toggle]'));
    assert.match(document.querySelector('[data-brain-scale-reference="human-budget-100000"]').parentElement.textContent,/1\.88×10¹⁶/);
    assert.doesNotMatch(document.querySelector('[data-brain-scale-reference="human-budget-100000"]').parentElement.textContent,/18\.8Q/);
    await select('dollars-per-voxel');
    for(const text of document.querySelectorAll('[data-acquisition-y-tick]')) assert.doesNotMatch(text.textContent,/[MBTQ]/);
  }finally{await cleanup();}
});

test('modal and selected image/data export titles, point keys and fit metadata describe the selected metric without changing source fits',async()=>{
  const anchor='metric-panel-acquisition-economics';
  const cleanup=await mount(React.createElement(DraftChartPanel,{plot,anchor}),'#'+anchor);
  try{
    assert.equal(document.querySelector('dialog h2').textContent,'Estimated acquisition efficiency');
    for(const [mode,label,title,convert] of modes){
      await select(mode);
      const selected=(await whenChartRegistered(anchor,0)).getChart();
      assert.match(selected.title,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      for(const key of selected.pointKey) assert.ok(key.label.includes(mode==='voxels-per-dollar'?'vox/$':mode==='human-brain'?'per human brain':'per voxel'));
      const image=buildChartImage(selected,window.location.href);
      const doc=new JSDOM(image.svg,{contentType:'image/svg+xml'}).window.document;
      assert.ok(doc.documentElement.textContent.includes(title));
      if(mode==='human-brain'){
        assert.ok(selected.notes.some(note=>/2032\.7.*extrapolation.*beyond displayed range/.test(note)));
        const visible=[...doc.querySelectorAll('text')].map(n=>n.textContent).join(' ');
        assert.match(visible,/2032\.7.*extrapolation.*beyond displayed range/);
        assert.match(visible,/2039\.3.*extrapolation.*beyond displayed range/);
        assert.equal(doc.querySelectorAll('line[stroke-dasharray="7 3"]').length,2,'visible dashed extrapolation keys survive export');
      }
      const data=JSON.parse(decodeURIComponent(document.querySelector('dialog [data-selected-plot-json]').getAttribute('href').split(',')[1]));
      assert.equal(data.acquisitionView.metric,mode);
      assert.equal(data.acquisitionView.fitBasis,'voxels/$');
      assert.ok(data.acquisitionView.transformation.includes('efficiency'));
      for(const [i,line] of data.referenceTrendlines.entries()){
        assert.deepEqual(line.fit,plot.referenceTrendlines[i].fit);
        assert.match(line.note,/fit diagnostics.*original voxels\/\$/i);
        for(const [j,point] of line.points.entries()) assert.equal(point.y,convert(plot.referenceTrendlines[i].points[j].y));
      }
      assert.equal(data.points[9].y,convert(1e11));
      assert.match(data.points[9].note,/citation mismatch.*HiExM/i);
    }
  }finally{await cleanup();}
});


test('cost ticks use compact precision and SI dollars to fit the unchanged efficiency margin',async()=>{
  const cleanup=await mount(React.createElement(DraftChartPlot,{plot}));
  try{
    assert.deepEqual([...document.querySelectorAll('[data-acquisition-y-tick]')].map(n=>n.textContent),['$19T','$1.9T','$190B','$19B']);
    assert.equal(Number(document.querySelector('[data-acquisition-y-tick]').getAttribute('x')),38,'cost labels gain two pixels without moving the axis/points');
    await select('dollars-per-voxel');
    assert.deepEqual([...document.querySelectorAll('[data-acquisition-y-tick]')].map(n=>n.textContent),['10 n$','1 n$','0.1 n$','10 p$']);
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

test('crossings use the unchanged fitted equation, stop at a within-range crossing and reject non-growing fits',()=>{
  const source=plot.referenceTrendlines[0];
  const extended=acquisitionBillionCrossing(source,2040);
  assert.equal(extended.points.length,2);
  assert.equal(extended.points[0].x,2024);
  assert.equal(extended.points[1].x,extended.year);
  assert.ok(Math.abs(extended.points[1].y/1e9-1)<1e-12);
  assert.doesNotMatch(extended.label,/beyond displayed range/);
  assert.equal(acquisitionBillionCrossing({...source,fit:undefined},2025),null);
  assert.equal(acquisitionBillionCrossing({...source,fit:{...source.fit,slopeLog10PerYear:0}},2025),null);
  assert.equal(acquisitionBillionCrossing({...source,fit:{...source.fit,slopeLog10PerYear:-.2}},2025),null);
});
