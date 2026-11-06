import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { CurveCard } from '../src/components/performance-curves.tsx';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { CHART_PRESENTATION } from '../src/lib/chart-presentation.ts';
import { buildChartImage } from '../src/lib/chart-export.ts';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const plot = { id: 'type-fixture', title: 'Synthetic chart', xLabel: 'Publication year', yLabel: 'Fixture units', scale: 'linear', scope: 'Synthetic only.', points: [2000, 2020].map((x, i) => ({ id: `p${i}`, x, y: i + 1, label: `Fixture ${i}`, dateLabel: `${x}`, sourceTitle: 'Synthetic source', sourceUrl: 'https://example.org', quote: 'Fixture' })) };
const curve = { title: plot.title, unit: plot.yLabel, scale: 'linear', line: false, tracks: [{ id: 'fixture', label: 'Fixture' }], points: plot.points.map(p => ({ date: `${p.x}-01-01`, value: p.y, label: p.label, track: 'fixture', trackIndex: 0 })) };
const css = ['performance-curves', 'draft-chart-plot', 'draft-chart-panel', 'google-trends'].map(n => readFileSync(`src/components/${n}.css`, 'utf8')).join('\n');
function font(node) {
  for (; node; node = node.parentElement) {
    const size = Number.parseFloat(getComputedStyle(node).fontSize);
    if (Number.isFinite(size)) return size;
  }
  return NaN;
}
function harness() {
  const previous = globalThis.ResizeObserver, observers = [];
  let scale = 1;
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  };
  return {
    observers,
    configure(window) {
      const style = window.document.createElement('style'); style.textContent = css; window.document.head.append(style);
      window.SVGElement.prototype.getScreenCTM = () => ({ a: scale, b: 0 });
      window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 720, height: 300 });
    },
    async resize(next) {
      scale = next;
      await act(async () => { for (const o of observers.filter(o => !o.disconnected && o.target.localName === 'svg')) o.callback([{ contentRect: { width: 1000, height: 410 } }]); });
    },
    restore() { if (previous === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previous; },
  };
}

test('all chart families share 16px preview headings and 12px supporting type', async () => {
  assert.equal(CHART_PRESENTATION.labelFontSize, 12);
  const h = harness(); let cleanup;
  try {
    cleanup = await mount(React.createElement('div', { className: 'metric-chart-rail' },
      React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Scope', plot: curve }),
      React.createElement('div', { className: 'draft-popout-preview' }, React.createElement(DraftChartPlot, { plot, preview: true })),
      React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] })), '', h.configure);
    for (const heading of document.querySelectorAll('.pc-card-title, figcaption, .gt-card h3')) assert.equal(font(heading), CHART_PRESENTATION.previewTitleFontSize);
    for (const label of document.querySelectorAll('.pc-preview text, .draft-plot-tick, .draft-plot-axis-title, .gt-preview text, .gt-preview-axis, .gt-legend')) assert.equal(font(label), CHART_PRESENTATION.supportingFontSize, label.outerHTML);
    assert.equal(document.querySelector('.draft-plot-inspector'), null);
    for (const caption of document.querySelectorAll('.pc-preview-axis')) assert.equal(getComputedStyle(caption).textAlign, 'left', 'Date captions share the heading edge');
    const draftDate=document.querySelector('.draft-plot-svg .draft-plot-axis-title:last-of-type');
    assert.equal(draftDate.getAttribute('x'),'0', 'Draft date caption shares the common edge');
  } finally { if (cleanup) await cleanup(); h.restore(); }
});

for (const family of ['curve', 'trends']) test(`${family} full chart type is 12 actual CSS pixels at narrow, wide and height-capped scales; export is canonical`, async () => {
  const h = harness(); let cleanup;
  try {
    const node = family === 'curve' ? React.createElement(CurveCard, { id: 'tissue-mapped', title: curve.title, eyebrow: 'Fixture', coverage: 'Scope', plot: curve }) : React.createElement(GoogleTrends, { flat: true, selection: ['neurotech'] });
    cleanup = await mount(node, family === 'curve' ? '#tissue-mapped' : '#google-trends-neurotech', h.configure);
    const svg = document.querySelector('dialog svg');
    if (family==='curve') assert.equal([...svg.children].filter(e=>e.localName==='text').at(-1).getAttribute('x'),'0', 'Full date caption shares the heading edge');
    const spec = { svg, title: plot.title, anchor: family === 'curve' ? 'tissue-mapped' : 'google-trends-neurotech', notes: [] };
    let canonical;
    for (const scale of [560 / 720, 410 / 300, 1.25]) {
      await h.resize(scale);
      for (const label of svg.querySelectorAll('text')) assert.ok(Math.abs(font(label) * scale - 12) < 0.001, `${label.textContent}: ${font(label) * scale}`);
      const image = buildChartImage(spec, window.location.href).svg;
      if (canonical) assert.equal(image, canonical, 'Exports cannot inherit random viewport type sizes');
      canonical = image;
      const dom = new JSDOM(image, { contentType: 'image/svg+xml' });
      const exported = dom.window.document.querySelector('svg svg:not([data-export-brand])');
      const frame = exported.getAttribute('viewBox').split(/\s+/).map(Number);
      const exportScale = Number(exported.getAttribute('width')) / frame[2];
      for (const label of exported.querySelectorAll('text')) {
        const pixels = Number(label.getAttribute('font-size')) * exportScale;
        assert.ok(pixels >= 15.5 && pixels <= 22.5, `${pixels}px: bounded render-safe export type`);
      }
      dom.window.close();
    }
    await cleanup(); cleanup = undefined;
    assert.ok(h.observers.every(o => o.disconnected));
  } finally { if (cleanup) await cleanup(); h.restore(); }
});

for (const preview of [true, false]) test(`event date caption shares the left edge (preview=${preview})`, async () => {
 const timeline={scope:'Synthetic event fixture.',events:[{id:'a',year:2020,dateLabel:'2020',label:'Fixture',stage:'Research',sourceTitle:'Fixture',sourceUrl:'https://example.org',quote:'Fixture',note:'Fixture'}]};
 const cleanup=await mount(React.createElement(DraftEventTimeline,{timeline,preview}));
 try {const c=[...document.querySelectorAll('[data-draft-event-timeline] .draft-plot-axis-title')].at(-1);assert.equal(c.getAttribute('x'),'0');assert.equal(c.getAttribute('text-anchor'),'start');for(const s of c.querySelectorAll('tspan'))assert.equal(s.getAttribute('x'),'0');}finally{await cleanup();}
});
test('dense Trends samples stay 2.5 screen px with 7px source inspection; exports drop transient emphasis',async()=>{
 const h=harness();let cleanup;
 try{
  cleanup=await mount(React.createElement(GoogleTrends,{flat:true,selection:['neurotech']}),'#google-trends-neurotech',h.configure);
  const svg=document.querySelector('dialog svg'),point=svg.querySelector('[data-trend-point]');let canonical;
  for(const scale of [.9333,1,1.5733]){
   await h.resize(scale);assert.ok(Math.abs(Number(point.getAttribute('r'))*scale-2.5)<.001,'Resting dense sample radius');
   await act(async()=>point.dispatchEvent(new window.FocusEvent('focusin',{bubbles:true})));
   assert.ok(Math.abs(Number(point.getAttribute('r'))*scale-7)<.001);
   const image=buildChartImage({svg,title:'Trends fixture',anchor:'google-trends-neurotech',notes:[]},window.location.href).svg;
   if(canonical)assert.equal(image,canonical);canonical=image;
   const d=new JSDOM(image,{contentType:'image/svg+xml'});assert.equal(d.window.document.querySelector('[data-trend-point]').getAttribute('r'),'2.5');d.window.close();
   await act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
   assert.ok(Math.abs(Number(point.getAttribute('r'))*scale-2.5)<.001,'Resting dense sample radius');
  }
 }finally{if(cleanup)await cleanup();h.restore();}
});
