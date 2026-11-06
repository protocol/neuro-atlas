import { canonicalPerformanceAnchor } from "../src/data/field-velocity-links.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { mount } from './modal-helpers.mjs';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { parseFeed } from '../src/lib/field-velocity/schema.ts';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { buildChartImage, chartShareUrl } from '../src/lib/chart-export.ts';

const parse = xml => new JSDOM(xml, { contentType: 'image/svg+xml' });

test('selected A export is white with the official blue signature and a small authentic PL R&D footer', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300" style="--surface:#f7f4ed"><text x="0" y="18">Electrical units · log scale</text><circle data-value="741" cx="100" cy="200" r="5" fill="#6d5bff"/></svg>');
  try {
    const source = dom.window.document.querySelector('svg'), before = source.outerHTML;
    const image = buildChartImage({ svg: source, title: 'Simultaneous neural recordings', anchor: 'simultaneously-recorded-neurons', notes: ['Selected in-vivo observations; not a pooled growth curve.', 'Sources: Jun et al., Nature (2017).'], legend: [{ label: 'Electrical units', color: '#6d5bff' }] }, 'https://name:secret@atlas.example/neuro-atlas/field-velocity?recordingView=electrical&token=private');
    const out = parse(image.svg), doc = out.window.document;
    assert.equal(doc.querySelector('svg > rect').getAttribute('fill'), '#ffffff');
    const tab = doc.querySelector('[data-export-signature]');
    assert.ok(tab, 'Selected A blue signature tab is present');
    assert.deepEqual(['x', 'y', 'width', 'height', 'fill'].map(a => tab.getAttribute(a)), ['48', '0', '84', '9', '#115EF7']);
    const logo = doc.querySelector('[data-export-brand="pl-rd"]');
    assert.ok(logo, 'Real official logo, not a text-only substitute');
    assert.equal(logo.getAttribute('viewBox'), '0 0 406 176');
    assert.equal(logo.getAttribute('x'), '48');
    assert.equal(logo.getAttribute('width'), '124');
    assert.ok(logo.querySelector('polygon[fill="#115EF7"]'));
    assert.equal(logo.querySelectorAll('path').length, 13, 'Official icon + outlined Protocol Labs wordmark');
    assert.match(logo.textContent, /R&D/);
    const footer = doc.querySelector('[data-export-footer]');
    assert.match(footer.textContent, /Neuro Atlas/);
    assert.match(footer.textContent, /https:\/\/atlas.example\/neuro-atlas\/field-velocity\?recordingView=electrical#simultaneous-neural-recordings/);
    assert.match(doc.documentElement.textContent, /Selected in-vivo observations/);
    assert.match(doc.documentElement.textContent, /Sources: Jun et al/);
    assert.match(doc.documentElement.textContent, /Electrical units/);
    assert.equal(source.outerHTML, before);
    assert.equal(doc.querySelectorAll('image, use, mask, foreignObject, script, a, [href]').length, 0);
    assert.doesNotMatch(image.svg, /secret|private|token=/);
    out.window.close();
  } finally { dom.window.close(); }
});

test('every exported chart replaces long notes with one Neuro Atlas referral and the existing direct link', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300"><circle data-value="741" cx="100.123" cy="200.456" r="5" fill="#115ef7"/></svg>');
  try {
    const svg = dom.window.document.querySelector('svg'), before = svg.outerHTML;
    const base = { svg, title: 'Selected chart', anchor: 'tissue-mapped', notes: [] };
    const empty = buildChartImage(base, 'https://atlas.example/neuro-atlas/field-velocity');
    for (const notes of [[], ['Long methodology and scope that should remain on the site.'], Array.from({ length: 30 }, (_, i) => `Detailed source ${i}: the original evidence is retained.`)]) {
      const image = buildChartImage({ ...base, notes, captionNotes: ['Previous editorial footnote.'] }, 'https://atlas.example/neuro-atlas/field-velocity');
      const out = parse(image.svg), doc = out.window.document;
      const visible = [...doc.querySelectorAll('text')].map(node => node.textContent).join(' ');
      assert.equal((visible.match(/More information on Neuro Atlas\./g) ?? []).length, 1);
      assert.ok(visible.includes('https://atlas.example/neuro-atlas/field-velocity#tissue-mapped'));
      for (const note of [...notes, 'Previous editorial footnote.']) assert.ok(!visible.includes(note), 'No long or legacy caption notes are painted into the image');
      assert.equal(doc.querySelectorAll('[data-export-footnotes], [data-export-note]').length, 0);
      assert.equal(doc.querySelector('desc').textContent, notes.join('\n'), 'Full source evidence may remain nonvisual; native PNG/clipboard have no footnote block');
      assert.equal(image.height, empty.height, 'Image size no longer grows with footnotes');
      assert.ok(doc.querySelector('[data-export-brand="pl-rd"]'));
      assert.deepEqual(['cx', 'cy', 'data-value'].map(key => doc.querySelector('[data-value]').getAttribute(key)), ['100.123', '200.456', '741']);
      out.window.close();
    }
    assert.equal(svg.outerHTML, before);
  } finally { dom.window.close(); }
});

test('dark source neutral paints become a readable white export on the clone while series colors and uncertainty survive', () => {
  const dom = new JSDOM(`<style>.label { fill: var(--foreground); } .muted {fill:#a1a1aa} .grid {stroke:var(--border)}</style><div style="--surface:#111113;--foreground:#f4f4f5;--muted:#a1a1aa;--faint:#63636b;--border:#232328;--accent:#8b7dff"><svg viewBox="0 0 720 300"><text class="label" x="0" y="18">Units · log scale</text><g fill="var(--foreground)"><text x="55" y="80">1,000</text></g><text fill="white" x="10" y="100">Explicit white label</text><text class="muted" x="10" y="120">Source publication date</text><line class="grid" x1="70" x2="700" y1="80" y2="80"/><circle data-curve-point="observed" data-value="10" cx="100" cy="200" r="5" fill="var(--accent)" stroke="var(--surface)"/><circle data-under-indexed="true" data-curve-point="partial" cx="200" cy="100" r="5" fill="var(--surface)" stroke="#22c55e"/><polyline data-extrapolation-line="neurons" points="100,200 200,100" stroke="var(--accent)" stroke-dasharray="8 5" fill="none"/><text x="10" y="140" stroke="var(--surface)" stroke-width="4" paint-order="stroke">Conditional target</text></svg></div>`);
  try {
    const svg = dom.window.document.querySelector('svg'), before = svg.outerHTML;
    const image = buildChartImage({ svg, title: 'White export', anchor: 'simultaneously-recorded-neurons', notes: ['Not a forecast.'], legend: [{ label: 'Selected series', color: 'var(--accent)', marker: 'dashed' }] }, 'https://atlas.example/neuro-atlas/field-velocity');
    const out = parse(image.svg), plot = out.window.document.querySelector('svg svg');
    for (const label of plot.querySelectorAll('text')) {
      assert.ok(['#172033', '#616b7c'].includes(label.getAttribute('fill')), label.outerHTML);
    }
    assert.equal(plot.querySelector('line').getAttribute('stroke'), '#dfe5ec');
    assert.equal(plot.querySelector('[data-value]').getAttribute('fill'), '#8b7dff');
    assert.equal(plot.querySelector('[data-value]').getAttribute('stroke'), '#ffffff');
    const partial = plot.querySelector('[data-under-indexed]');
    assert.equal(partial.getAttribute('fill'), '#ffffff');
    assert.equal(partial.getAttribute('stroke'), '#22c55e');
    assert.equal(plot.querySelector('polyline').getAttribute('stroke-dasharray'), '8 5');
    assert.equal(plot.querySelector('polyline').getAttribute('stroke'), '#8b7dff');
    assert.equal(plot.querySelector('text[paint-order="stroke"]').getAttribute('stroke'), '#ffffff');
    assert.equal(svg.outerHTML, before, 'Theme is not toggled or rewritten on source DOM');
    out.window.close();
  } finally { dom.window.close(); }
});

test('export text and non-scaling outlines use a local render-safe canonical contract rather than live viewport typography', () => {
  const dom = new JSDOM('<style>svg text { font-size: inherit; font-family: UnavailableWebfont; letter-spacing: normal }</style><svg viewBox="0 0 720 300" style="font-size:40px"><text x="0" y="18">Units <tspan>mm³</tspan></text><line x1="80" x2="700" y1="80" y2="80" stroke="#123456" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="100" cy="200" r="10" data-export-r="5" stroke="#123456" stroke-width="6" data-export-stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>');
  try {
    const svg = dom.window.document.querySelector('svg'), spec = { svg, title: 'Canonical type', anchor: 'tissue-mapped', notes: [] };
    const first = buildChartImage(spec, 'https://atlas.example/field-velocity');
    svg.style.fontSize = '8px';
    const second = buildChartImage(spec, 'https://atlas.example/field-velocity');
    const a = parse(first.svg), b = parse(second.svg);
    for (const doc of [a.window.document, b.window.document]) {
      const plot = doc.querySelector('svg svg');
      for (const label of plot.querySelectorAll('text, tspan')) {
        assert.equal(label.getAttribute('font-size'), '12');
        assert.equal(label.getAttribute('font-family'), 'Arial, Helvetica, Liberation Sans, sans-serif');
      }
      assert.equal(plot.querySelector('line').getAttribute('vector-effect'), 'non-scaling-stroke');
      assert.equal(plot.querySelector('circle').getAttribute('stroke-width'), '1.5');
      assert.equal(plot.querySelector('circle').getAttribute('r'), '5');
      assert.doesNotMatch(plot.outerHTML, /UnavailableWebfont|font-size="(?:8|40)px"|@font-face|https?:\/\/[^" ]+\.(?:woff|ttf)/);
    }
    a.window.close(); b.window.close();
  } finally { dom.window.close(); }
});

test('the shared 48px editorial edge contains y tick glyphs with an internal gutter and left-aligned axis captions', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300"><text x="80" y="16">Electrical units · log scale</text><g><line x1="80" x2="700" y1="70" y2="70" stroke="#dfe5ec"/><text x="30" y="74" text-anchor="end">10,000</text></g><circle data-source-observation="p1" data-value="741" cx="100.123456789" cy="200.987654321" r="5" fill="#115ef7"/><text x="360" y="297" text-anchor="middle">Source publication date</text></svg>');
  try {
    const svg = dom.window.document.querySelector('svg'), before = svg.outerHTML;
    const image = buildChartImage({ svg, title: 'Simultaneous neural recordings', anchor: 'simultaneously-recorded-neurons', notes: ['Sources: Jun et al., Nature (2017).'] }, 'https://atlas.example/field-velocity');
    const out = parse(image.svg), doc = out.window.document, plot = doc.querySelector('svg svg');
    const [left, top, width, height] = plot.getAttribute('viewBox').split(/\s+/).map(Number);
    const scale = Number(plot.getAttribute('width')) / width;
    const screenX = x => Number(plot.getAttribute('x')) + (x - left) * scale;
    assert.ok(left < 0, 'The safe viewBox reserves space for the protruding end-anchored tick');
    assert.ok(left + width >= 720 && top <= 0 && top + height >= 300, 'No original viewBox region is cropped');
    const tick = [...plot.querySelectorAll('text')].find(n => n.textContent === '10,000');
    assert.ok(screenX(Number(tick.getAttribute('x')) - 6 * 12) >= 48, 'Even conservative tick glyph bounds stay inside the shared edge');
    for (const caption of [...plot.querySelectorAll('text')].filter(n => /Electrical units|Source publication date/.test(n.textContent))) {
      assert.equal(caption.getAttribute('text-anchor'), 'start');
      assert.ok(Math.abs(screenX(Number(caption.getAttribute('x'))) - 48) < 0.001, caption.outerHTML);
    }
    const title = doc.querySelector('svg > text');
    assert.equal(title.getAttribute('x'), '48');
    assert.equal(doc.querySelector('[data-export-info]').getAttribute('text-anchor'), 'end');
    const point = plot.querySelector('[data-source-observation]');
    assert.equal(point.getAttribute('cx'), '100.123456789');
    assert.equal(point.getAttribute('cy'), '200.987654321');
    assert.equal(point.getAttribute('data-value'), '741');
    assert.equal(svg.outerHTML, before);
    out.window.close();
  } finally { dom.window.close(); }
});

test('white branding replaces literal full-plot surfaces without recoloring meaningful data rectangles', () => {
  for (const fill of ['#f7f4ed', '#111113']) {
    const dom = new JSDOM(`<svg viewBox="0 0 720 300"><rect x="0" y="0" width="100%" height="100%" fill="${fill}"/><rect data-value="10" x="80" y="100" width="40" height="120" fill="#8b7dff"/><text x="0" y="18" fill="white">Units</text></svg>`);
    try {
      const svg = dom.window.document.querySelector('svg'), before = svg.outerHTML;
      const image = buildChartImage({ svg, title: 'White plot', anchor: 'tissue-mapped', notes: [] }, 'https://atlas.example/field-velocity');
      const out = parse(image.svg), plot = out.window.document.querySelector('svg svg');
      assert.equal(plot.querySelector('rect').getAttribute('fill'), '#ffffff');
      assert.equal(plot.querySelector('[data-value]').getAttribute('fill'), '#8b7dff');
      assert.equal(svg.outerHTML, before);
      out.window.close();
    } finally { dom.window.close(); }
  }
});

test('export labels stay readable at the fixed image width even when adaptive source viewBoxes vary', () => {
  for (const width of [320, 720, 1440]) {
    const dom = new JSDOM(`<svg viewBox="0 0 ${width} 300"><text x="0" y="18">Units</text><text x="100" y="100" text-anchor="end">10,000</text><circle data-value="10" cx="200" cy="200" r="5" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`);
    try {
      const svg = dom.window.document.querySelector('svg');
      const image = buildChartImage({ svg, title: 'Adaptive labels', anchor: 'tissue-mapped', notes: [] }, 'https://atlas.example/field-velocity');
      const out = parse(image.svg), plot = out.window.document.querySelector('svg svg');
      const frame = plot.getAttribute('viewBox').split(/\s+/).map(Number), scale = Number(plot.getAttribute('width')) / frame[2];
      for (const label of plot.querySelectorAll('text')) {
        const pixels = Number(label.getAttribute('font-size')) * scale;
        assert.ok(pixels >= 15.5 && pixels <= 22.5, `${width}: ${pixels}px`);
      }
      assert.equal(plot.querySelector('[data-value]').getAttribute('cx'), '200');
      out.window.close();
    } finally { dom.window.close(); }
  }
});

test('native glyph measurement sees only the canonical inert clone in an isolated tree and always cleans up', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 300"><text x="80" y="16">Units</text><text x="30" y="74" text-anchor="end">10,000</text><circle data-value="741" cx="100" cy="200" r="5"/></svg>');
  try {
    const svg = dom.window.document.querySelector('svg'), before = dom.window.document.body.innerHTML;
    let measurements = 0;
    dom.window.SVGElement.prototype.getBBox = function () {
      measurements++;
      assert.notEqual(this, svg);
      assert.ok(this.isConnected);
      assert.ok(this.getRootNode() instanceof dom.window.ShadowRoot);
      assert.equal(this.querySelector('text').getAttribute('font-size'), '12');
      assert.equal(this.querySelector('[data-export-axis-caption]').getAttribute('display'), 'none');
      return { x: -52.5, y: 30, width: 755, height: 250 };
    };
    const image = buildChartImage({ svg, title: 'Measured native glyph bounds', anchor: 'tissue-mapped', notes: [] }, 'https://atlas.example/field-velocity');
    const out = parse(image.svg), plot = out.window.document.querySelector('svg svg');
    assert.ok(measurements > 0);
    assert.equal(Number(plot.getAttribute('viewBox').split(' ')[0]), -56.5);
    assert.equal(dom.window.document.body.innerHTML, before);
    assert.equal(plot.querySelector('[display="none"]'), null);
    out.window.close();
    dom.window.SVGElement.prototype.getBBox = () => { throw new Error('Native measurement unavailable'); };
    buildChartImage({ svg, title: 'Fallback', anchor: 'tissue-mapped', notes: [] }, 'https://atlas.example/field-velocity');
    assert.equal(dom.window.document.body.innerHTML, before, 'Measurement exceptions never leak the hidden tree');
  } finally { dom.window.close(); }
});

test('export removes pointer-only emphasis without mutating the actual plotted marks', async () => {
  globalThis.React = React;
  const feed = parseFeed(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
  const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
  const cleanup = await mount(React.createElement(PerformanceCurves, { data: selectPerformance(feed), provenance }), '#tissue-mapped');
  try {
    const svg = document.querySelector('dialog svg');
    const spec = { svg, title: 'Tissue', anchor: 'tissue-mapped', notes: [] };
    const baseline = buildChartImage(spec, window.location.href).svg;
    const point = svg.querySelector('[data-curve-point]');
    await act(async () => point.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 60, clientY: 80 })));
    assert.equal(point.getAttribute('r'), '7', 'Real hover changed the source DOM');
    assert.equal(buildChartImage(spec, window.location.href).svg, baseline, 'Export must not freeze random hover styling');
    assert.equal(point.getAttribute('r'), '7', 'Export never mutates the live chart');
  } finally { await cleanup(); }
});

for (const theme of ['light', 'dark']) test(`${theme}: complete viewBox, marks and computed paint survive independently of viewport size`, () => {
  const background = theme === 'dark' ? '#101820' : '#ffffff';
  const ink = theme === 'dark' ? '#e8edf4' : '#112233';
  const dom = new JSDOM(`<style>.axis { fill: ${ink}; font-size: 13px; } .grid {stroke: #567890; stroke-width: 1.5px;}</style><svg viewBox="-10 -20 720 380" style="--surface:${background};--foreground:${ink};--accent:#aabbcc;width:200px;height:80px"><text class="axis" x="10" y="20">Scientific units mm³</text><line class="grid" x1="0" y1="0" x2="700" y2="0"/><polyline points="1.2345678901,2.3456789012 700,300" stroke="var(--accent)" stroke-dasharray="8 5" fill="none"/><circle data-value="1.2345678901234567" cx="200.123456789" cy="250.987654321" r="5" fill="currentColor" style="color:#be3456"/></svg>`);
  try {
    const source = dom.window.document.querySelector('svg');
    source.getBoundingClientRect = () => { throw new Error('Never capture the tiny clipped DOM viewport'); };
    const image = buildChartImage({ svg: source, title: 'Title & scope <not markup>', anchor: 'tissue-mapped', notes: ['Partial specimen, not whole-brain reconstruction.'], legend: [{ color: 'var(--accent)', label: 'Human partial cortex', marker: 'triangle' }] }, 'https://user:password@atlas.example/neuro-atlas/field-velocity?token=secret');
    assert.equal(image.width, 1200);
    const out = parse(image.svg);
    const doc = out.window.document;
    assert.equal(doc.querySelector('svg svg').getAttribute('viewBox'), '-10 -20 720 380');
    assert.equal(doc.querySelector('svg > rect').getAttribute('fill'), '#ffffff', 'White brand background is independent of source theme');
    assert.equal(doc.querySelector('polyline').getAttribute('points'), source.querySelector('polyline').getAttribute('points'));
    assert.equal(doc.querySelector('polyline').getAttribute('stroke'), '#aabbcc');
    assert.equal(doc.querySelector('polyline').getAttribute('stroke-dasharray'), '8 5');
    assert.equal(doc.querySelector('line').getAttribute('stroke-width'), '1.5px');
    assert.equal(doc.querySelector('[data-value]').getAttribute('data-value'), '1.2345678901234567');
    assert.equal(doc.querySelector('[data-value]').getAttribute('cx'), '200.123456789');
    assert.equal(doc.querySelector('[data-value]').getAttribute('fill'), 'rgb(190, 52, 86)');
    assert.equal(doc.querySelector('svg svg text').getAttribute('font-size'), '12', 'Canonical export type does not inherit live 13px viewport text');
    assert.ok(doc.querySelector('polygon'));
    assert.doesNotMatch(image.svg, /secret|password|token=|var\(|currentColor/);
    assert.match(image.svg, /&lt;not markup&gt;/);
    out.window.close();
  } finally { dom.window.close(); }
});

test('SVG export is inert and local: drops active markup, external resources, tooltip UI, handlers and stylesheet links', () => {
  const dom = new JSDOM(`<svg viewBox="0 0 600 300"><script>active()</script><foreignObject><div>UI buttons</div></foreignObject><image href="https://evil.example/image"/><use href="https://evil.example/marks"/><style>@import 'https://evil.example/css';</style><a href="javascript:active()"><circle cx="2" cy="2" r="3"/></a><g role="tooltip"><text>Random hover</text></g><circle onload="active()" cx="30" cy="40" r="5" fill="url(https://evil.example/paint)"/><text>Safe &amp; qualified</text></svg>`);
  try {
    const image = buildChartImage({ svg: dom.window.document.querySelector('svg'), title: 'Chart', anchor: 'tissue-mapped', notes: ['Source: <img onerror="active()">'] }, 'https://atlas.example/field-velocity');
    const out = parse(image.svg);
    assert.equal(out.window.document.querySelectorAll('script, foreignObject, image, use, style, a, [onload]').length, 0);
    assert.doesNotMatch(image.svg, /evil.example|Random hover|UI buttons|javascript:/);
    assert.match(image.svg, /&lt;img/);
    assert.equal(out.window.document.querySelectorAll('circle').length, 1);
    out.window.close();
  } finally { dom.window.close(); }
});

test('large chart dimensions remain bounded while supporting notes are nonvisual and do not resize the image', () => {
  const dom = new JSDOM('<svg viewBox="0 0 720 1400"><text>Entire tall chart</text></svg>');
  try {
    const svg = dom.window.document.querySelector('svg');
    const source = svg.outerHTML;
    const spec = { svg, title: 'A dynamic chart', anchor: 'tissue-mapped', notes: Array.from({ length: 20 }, (_, i) => `Scope note ${i}: must remain readable.`) };
    const image = buildChartImage(spec, 'https://atlas.example/field-velocity');
    assert.equal(image.height, buildChartImage({ ...spec, notes: [] }, 'https://atlas.example/field-velocity').height, 'Notes do not add a tall block to the exported image');
    assert.match(image.svg, /Scope note 19/);
    assert.equal(svg.outerHTML, source);
    svg.setAttribute('viewBox', '0 0 1 100000');
    assert.throws(() => buildChartImage(spec, 'https://atlas.example/field-velocity'), /bounds/);
    svg.removeAttribute('viewBox');
    assert.throws(() => buildChartImage(spec, 'https://atlas.example/field-velocity'), /viewBox/);
  } finally { dom.window.close(); }
});

test('share link validates chart identity and strips URL credentials/query while preserving origin and basePath', () => {
  assert.equal(chartShareUrl('https://name:secret@atlas.example/neuro-atlas/field-velocity?token=a&token=b#previous', 'tissue-mapped'), 'https://atlas.example/neuro-atlas/field-velocity#selected-tissue-volume-checkpoints');
  assert.throws(() => chartShareUrl('https://atlas.example/', 'made-up-target'), /Unknown/);
  assert.throws(() => chartShareUrl('javascript:alert(1)', 'tissue-mapped'), /HTTP/);
});


test('recording image URLs retain only an exact single allowlisted measurement view for the recording anchor', () => {
  const anchor = 'simultaneously-recorded-neurons';
  const clean = 'https://atlas.example/neuro-atlas/field-velocity';
  for (const view of ['electrical', 'human-channels', 'optical']) {
    assert.equal(chartShareUrl(`https://name:secret@atlas.example/neuro-atlas/field-velocity?token=private&review=1&recordingView=${view}`, anchor), `${clean}?recordingView=${view}#${canonicalPerformanceAnchor(anchor)}`);
    assert.equal(chartShareUrl(`${clean}?recordingView=${view}`, 'tissue-mapped'), `${clean}#selected-tissue-volume-checkpoints`);
  }
  for (const query of ['recordingView=unknown', 'recordingView=OPTICAL', 'recordingView=optical%20', 'recordingView=', 'recordingView=optical&recordingView=human-channels', 'recordingView=optical&recordingView=optical', 'recordingView=%3Cscript%3E', 'recordingView=%E0%A4%A']) {
    assert.equal(chartShareUrl(`${clean}?token=private&${query}`, anchor), `${clean}#${canonicalPerformanceAnchor(anchor)}`, query);
  }
});

test('legacy caption inputs do not restore painted footnotes while complete source evidence remains nonvisual', () => {
 const dom=new JSDOM('<svg viewBox="0 0 720 300"><circle cx="100" cy="100" r="5"/></svg>');
 const notes=['Full methodology paragraph with every archived source detail.'];
 const image=buildChartImage({svg:dom.window.document.querySelector('svg'),title:'Caption test',anchor:'tissue-mapped',notes,captionNotes:['741 putative single neurons · Jun et al., 2017 · publication date']},'https://atlas.example/field-velocity');
 const out=parse(image.svg);
 const visible=[...out.window.document.querySelectorAll('text')].map(e=>e.textContent).join(' ');
 assert.ok(!visible.includes('741 putative single neurons'));
 assert.ok(visible.includes('More information on Neuro Atlas.'));
 assert.ok(!visible.includes(notes[0]));
 assert.ok(out.window.document.querySelector('desc').textContent.includes(notes[0]));
 dom.window.close();out.window.close();
});
