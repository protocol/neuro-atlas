import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const tissue = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'))['Brain tissue mapped over time'].plots[0];
const humanId = 'h01-human-imaged-2021-06-01';
const mouseId = 'microns-mouse-imaged-2021-07-01';
const marker = (document, id) => document.querySelector(`circle[data-source-observation="${id}"]`);

test('earlier and later partial mouse cortex checkpoints use the same green species color', () => {
  const plot = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'))['Largest published connectome over time'].plots[0];
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
  try {
    const mouse = plot.points.filter(p => p.group === 'Partial mouse cortex');
    assert.equal(mouse.length, 2);
    for (const point of mouse) assert.equal(marker(dom.window.document, point.id).getAttribute('fill'), '#3b8b62');
  } finally { dom.window.close(); }
});

function assertTruePosition(document, point) {
  const circle = marker(document, point.id);
  const grids = [...document.querySelectorAll('.draft-plot-gridline')];
  const left = Number(grids[0].getAttribute('x1'));
  const right = Number(grids[0].getAttribute('x2'));
  const top = Number(grids.at(-1).getAttribute('y1'));
  const bottom = Number(grids[0].getAttribute('y1'));
  const minX = Math.floor(Math.min(...tissue.points.map(p => p.x)));
  const maxX = Math.ceil(Math.max(...tissue.points.map(p => p.x)));
  const minPower = Math.floor(Math.log10(Math.min(...tissue.points.map(p => p.y))));
  const maxPower = Math.ceil(Math.log10(Math.max(...tissue.points.map(p => p.y))));
  assert.equal(Number(circle.getAttribute('cx')), left + (point.x - minX) / (maxX - minX) * (right - left));
  assert.equal(Number(circle.getAttribute('cy')), bottom - (Math.log10(point.y) - minPower) / (maxPower - minPower) * (bottom - top));
  assert.equal(circle.closest('[transform]'), null, 'Do not jitter quantitative marker positions');
}

test('H01 remains visible as an outline around MICrONS without changing either source coordinate', () => {
  const before = JSON.stringify(tissue);
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot: tissue })));
  try {
    const document = dom.window.document;
    const human = marker(document, humanId);
    const mouse = marker(document, mouseId);
    assert.equal(document.querySelectorAll('circle[data-source-observation]').length, tissue.points.length);
    assert.equal(human.getAttribute('fill'), 'none', 'An outline must expose the nearby filled observation');
    const separation = Math.abs(Number(human.getAttribute('cx')) - Number(mouse.getAttribute('cx')));
    assert.ok(Number(human.getAttribute('r')) > Number(mouse.getAttribute('r')) + separation, 'The human outline remains outside the mouse dot');
    assert.notEqual(human.getAttribute('stroke'), mouse.getAttribute('fill'));
    assert.equal(human.getAttribute('pointer-events'), 'stroke', 'The outline interior must not steal the inner point hit target');
    for (const id of [humanId, mouseId]) {
      const point = tissue.points.find(point => point.id === id);
      assertTruePosition(document, point);
      assert.equal(marker(document, id).getAttribute('tabindex'), '0');
      assert.match(marker(document, id).getAttribute('aria-label'), new RegExp(point.group));
    }
    assert.equal(JSON.stringify(tissue), before, 'Rendering never mutates source evidence');
  } finally { dom.window.close(); }
});

test('species colors stay distinct and consistent when point order changes between plots', () => {
  const variants = [tissue, { ...tissue, points: [...tissue.points].reverse() }];
  for (const plot of variants) {
    const dom = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));
    try {
      const document = dom.window.document;
      const color = circle => circle.getAttribute('fill') === 'none' ? circle.getAttribute('stroke') : circle.getAttribute('fill');
      assert.equal(color(marker(document, mouseId)), '#3b8b62', 'Mouse is green in every plot, not whichever palette slot appears first');
      assert.equal(color(marker(document, humanId)), '#9275ca', 'Human stays purple even when groups are reordered');
      const legendItems = [...document.querySelectorAll('[data-draft-group-legend] li')];
      assert.equal(legendItems.find(li => li.textContent.includes('Mouse')).querySelector('span').style.color, 'rgb(59, 139, 98)');
      assert.equal(legendItems.find(li => li.textContent.includes('Human')).querySelector('span').style.color, 'rgb(146, 117, 202)');
    } finally { dom.window.close(); }
  }
});

test('annotation keys stay bounded and distinct through narrow-card resizes while every source position remains exact', async () => {
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  const annotated = { ...tissue, points: tissue.points.map(point => ({ ...point, annotation: `${point.label} · ${point.group} · ${point.y}` })) };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: annotated }));
  try {
    for (const width of [560, 280, 200, 560]) {
      await act(async () => resize([{ contentRect: { width } }]));
      const svg = document.querySelector('svg');
      const height = Number(svg.getAttribute('viewBox').split(' ')[3]);
      assert.equal(Number(svg.getAttribute('viewBox').split(' ')[2]), width);
      assert.equal(document.querySelectorAll('[data-point-annotation]').length, tissue.points.length);
      for (const point of annotated.points) {
        assertTruePosition(document, point);
        const rect = document.querySelector(`[data-annotation-key="${point.id}"] rect`);
        const x = Number(rect.getAttribute('x'));
        const y = Number(rect.getAttribute('y'));
        assert.ok(x >= 0 && x + Number(rect.getAttribute('width')) <= width, `${point.id}: bounded horizontally at ${width}px`);
        assert.ok(y >= 0 && y + Number(rect.getAttribute('height')) <= height, `${point.id}: bounded vertically at ${width}px`);
        assert.ok(document.querySelector(`[data-point-annotation="${point.id}"]`).textContent.includes(point.annotation));
      }
      const keys = [humanId, mouseId].map(id => document.querySelector(`[data-annotation-key="${id}"] rect`));
      assert.ok(Math.abs(Number(keys[0].getAttribute('x')) - Number(keys[1].getAttribute('x'))) >= 20, 'The near-coincident pair keeps separate readable numbered keys');
      const human = marker(document, humanId);
      const mouse = marker(document, mouseId);
      assert.ok(Number(human.getAttribute('r')) > Number(mouse.getAttribute('r')) + Math.abs(Number(human.getAttribute('cx')) - Number(mouse.getAttribute('cx'))));
    }
  } finally {
    await cleanup();
    delete globalThis.ResizeObserver;
  }
});

test('dense imaging annotations avoid all markers and other keys at 320px', async () => {
  const evidence = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'));
  const plot = evidence['Connectomics imaging throughput over time'].plots.find(plot => plot.id === 'acquisition-economics');
  assert.ok(plot, 'Exercise the real optical / EM comparison');
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot }));
  try {
    await act(async () => resize([{ contentRect: { width: 320 } }]));
    const circles = [...document.querySelectorAll('circle[data-source-observation]')];
    const keys = [...document.querySelectorAll('[data-annotation-key] rect')].map(rect => ({
      id: rect.parentElement.dataset.annotationKey,
      x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
      width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')),
    }));
    assert.equal(keys.length, plot.points.length, 'Every authored label has a readable key');
    for (const [index, key] of keys.entries()) {
      for (const circle of circles) {
        const cx = Number(circle.getAttribute('cx'));
        const cy = Number(circle.getAttribute('cy'));
        const dx = cx - Math.max(key.x, Math.min(cx, key.x + key.width));
        const dy = cy - Math.max(key.y, Math.min(cy, key.y + key.height));
        assert.ok(Math.hypot(dx, dy) >= Number(circle.getAttribute('r')) + 3, `${key.id} must clear ${circle.dataset.sourceObservation}`);
      }
      for (const other of keys.slice(index + 1)) {
        assert.ok(key.x + key.width + 3 <= other.x || other.x + other.width + 3 <= key.x
          || key.y + key.height + 3 <= other.y || other.y + other.height + 3 <= key.y,
        `${key.id} must clear ${other.id}`);
      }
    }
  } finally {
    await cleanup();
    delete globalThis.ResizeObserver;
  }
});

test('an optional per-point annotation is persistent, source-linked by a true-position leader, and independently operable', async () => {
  const point = { ...tissue.points[0], annotation: 'Bock mouse · ≈0.00000819 cm³' };
  const annotated = { ...tissue, points: tissue.points.map(p => p.id === point.id ? point : p) };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: annotated }));
  try {
    const label = document.querySelector(`[data-point-annotation="${point.id}"]`);
    assert.ok(label, 'The selected annotation is visible before any hover or focus');
    assert.ok(label.textContent.includes(point.annotation));
    assert.equal(label.closest('details'), null);
    assert.equal(label.tagName, 'BUTTON', 'The persistent label is a native keyboard and pointer target');
    assert.equal(label.disabled, false);
    const leader = document.querySelector(`[data-annotation-leader="${point.id}"]`);
    assert.ok(leader, 'A leader identifies the actual quantitative position, not a relocated marker');
    assert.equal(leader.getAttribute('x1'), marker(document, point.id).getAttribute('cx'));
    assert.equal(leader.getAttribute('y1'), marker(document, point.id).getAttribute('cy'));
    assertTruePosition(document, point);
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await act(async () => label.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
    await act(async () => label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await act(async () => label.focus());
    assert.ok(document.querySelector('[role="tooltip"]').textContent.includes(point.label));
    assert.equal(label.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]').id);
    await act(async () => label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
    assert.ok(document.querySelector(`[data-point-annotation="${point.id}"]`).textContent.includes(point.annotation));
  } finally { await cleanup(); }
});
