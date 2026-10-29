import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
// Synthetic renderer fixtures only; not scientific observations.
const plot = {
  id: 'marker-fixture', title: 'Synthetic marker comparison',
  xKind: 'number', xLabel: 'Fixture input', yLabel: 'Fixture output',
  scale: 'linear', scope: 'Synthetic rendering fixture only.',
  points: [
    { id: 'human', x: 1, y: 10, group: 'Human dataset' },
    { id: 'multisem', x: 2, y: 20, group: 'Mouse multiSEM dataset' },
    { id: 'sbem', x: 3, y: 30, group: 'Mouse SBEM dataset' },
  ].map(point => ({
    ...point, label: `Fixture ${point.id}`, dateLabel: 'Synthetic date',
    sourceUrl: `https://example.org/${point.id}`, sourceTitle: `Source ${point.id}`,
    quote: 'Synthetic quoted value.',
  })),
};
const marker = (document, id) => document.querySelector(`[data-source-observation="${id}"]`);
const render = plot => new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot })));

test('explicit observation colors apply to the mark and its persistent annotation', () => {
  const styled = { ...plot, points: plot.points.map((point, index) => ({
    ...point, color: index ? '#3b8b62' : '#9275ca', annotation: point.label,
  })) };
  const before = JSON.stringify(styled);
  const dom = render(styled);
  try {
    const document = dom.window.document;
    for (const point of styled.points) {
      assert.equal(marker(document, point.id).getAttribute('fill'), point.color);
      assert.equal(document.querySelector(`[data-annotation-leader="${point.id}"]`).getAttribute('stroke'), point.color);
      assert.equal(document.querySelector(`[data-annotation-key="${point.id}"] rect`).getAttribute('stroke'), point.color);
      assert.ok(document.querySelector(`[data-point-annotation="${point.id}"]`).textContent.includes(point.label));
    }
    assert.equal(JSON.stringify(styled), before, 'Rendering never mutates source data');
  } finally { dom.window.close(); }
});

const styledPlot = () => ({ ...plot, points: plot.points.map((point, index) => ({
  ...point, color: index ? '#3b8b62' : '#9275ca', marker: ['circle', 'square', 'triangle'][index],
})) });

function centerOf(node) {
  if (node.tagName === 'circle') return [Number(node.getAttribute('cx')), Number(node.getAttribute('cy'))];
  if (node.tagName === 'rect') return [Number(node.getAttribute('x')) + Number(node.getAttribute('width')) / 2,
    Number(node.getAttribute('y')) + Number(node.getAttribute('height')) / 2];
  assert.equal(node.tagName, 'polygon');
  const vertices = node.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
  assert.equal(vertices.length, 3, 'A triangle has three vertices');
  return [0, 1].map(axis => vertices.reduce((sum, vertex) => sum + vertex[axis], 0) / vertices.length);
}

function assertSameCenter(actual, expected) {
  for (let axis = 0; axis < 2; axis++) assert.ok(Math.abs(actual[axis] - expected[axis]) < 1e-10,
    `${actual} must retain the exact quantitative center ${expected}`);
}

test('opt-in square and triangle markers retain circle-reference quantitative centers on both scales', () => {
  for (const scale of ['linear', 'log']) {
    const baseline = render({ ...plot, scale });
    const styled = styledPlot();
    const before = JSON.stringify(styled);
    const dom = render({ ...styled, scale });
    try {
      const document = dom.window.document;
      for (const [index, point] of styled.points.entries()) {
        const node = marker(document, point.id);
        assert.equal(node.tagName, ['circle', 'rect', 'polygon'][index]);
        assertSameCenter(centerOf(node), centerOf(marker(baseline.window.document, point.id)));
        assert.equal(node.closest('[transform]'), null, 'No positional jitter');
        assert.equal(node.getAttribute('fill'), point.color);
        assert.equal(node.getAttribute('stroke'), 'var(--surface)');
        assert.equal(node.getAttribute('role'), 'button');
        assert.equal(node.getAttribute('tabindex'), '0');
        assert.ok(node.getAttribute('aria-label').includes(point.sourceTitle));
      }
      assert.equal(JSON.stringify(styled), before);
    } finally { dom.window.close(); baseline.window.close(); }
  }
});

test('plot-level legend labels show the same colored dataset glyphs outside the disclosure', () => {
  const styled = styledPlot();
  styled.legend = styled.points.map((point, index) => ({
    label: ['Human', 'Mouse multiSEM', 'Mouse SBEM'][index], color: point.color, marker: point.marker,
  }));
  for (const candidate of [styled, { ...styled, points: [styled.points[0]], legend: [styled.legend[0]] }]) {
    const dom = render(candidate);
    try {
      const document = dom.window.document;
      const legend = document.querySelector('[data-draft-group-legend]');
      assert.ok(legend, 'Authored legend is visible even for one dataset');
      assert.equal(legend.closest('details'), null);
      const items = [...legend.querySelectorAll('li')];
      assert.deepEqual(items.map(li => li.textContent.trim()), candidate.legend.map(entry => entry.label));
      for (const [index, entry] of candidate.legend.entries()) {
        const svg = items[index].querySelector('svg');
        assert.ok(svg, 'Legend uses the actual SVG glyph, not a mismatched text symbol');
        assert.equal(svg.getAttribute('aria-hidden'), 'true');
        assert.equal(svg.getAttribute('focusable'), 'false');
        const glyph = svg.querySelector('circle, rect, polygon');
        assert.equal(glyph.tagName, marker(document, candidate.points[index].id).tagName);
        assert.equal(glyph.getAttribute('fill'), entry.color);
        assert.equal(glyph.getAttribute('tabindex'), null, 'Legend is descriptive, not a duplicate inspection target');
      }
    } finally { dom.window.close(); }
  }
});

test('automatic group legends inherit the representative observation style when no legend is authored', () => {
  const styled = styledPlot();
  const dom = render(styled);
  try {
    const items = [...dom.window.document.querySelectorAll('[data-draft-group-legend] li')];
    assert.equal(items.length, styled.points.length);
    for (const [index, point] of styled.points.entries()) {
      const glyph = items[index].querySelector('svg circle, svg rect, svg polygon');
      assert.ok(glyph, `${point.group} must show its actual marker shape`);
      assert.equal(glyph.tagName, marker(dom.window.document, point.id).tagName);
      assert.equal(glyph.getAttribute('fill'), point.color);
      assert.equal(items[index].textContent.trim(), point.group);
    }
  } finally { dom.window.close(); }
});

test('styled markers preserve inspection by keyboard, pointer and persistent labels', async () => {
  const styled = styledPlot();
  styled.points = styled.points.map(point => ({ ...point, annotation: point.label }));
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: styled }));
  try {
    for (const point of styled.points) {
      const node = marker(document, point.id);
      await act(async () => node.focus());
      assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
      assert.equal(node.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]').id);
      for (const key of ['Enter', ' ']) {
        await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        assert.equal(document.querySelector('[role="tooltip"]'), null);
        await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
        assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
      }
      for (const type of ['mousemove', 'click']) {
        await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
        await act(async () => node.dispatchEvent(new MouseEvent(type, { bubbles: true })));
        assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
      }
      await act(async () => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      await act(async () => document.querySelector(`[data-point-annotation="${point.id}"]`).click());
      assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
    }
  } finally { await cleanup(); }
});

test('mixed coincident markers keep outlined outer glyphs, true centers and bounded callouts on resize', async () => {
  const styled = styledPlot();
  styled.points = styled.points.map(point => ({ ...point, x: 2, y: 20 }));
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() {}
  };
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: styled }));
  try {
    for (const width of [560, 280, 200, 560]) {
      await act(async () => resize([{ contentRect: { width } }]));
      const svg = document.querySelector('.draft-plot-svg');
      const height = Number(svg.getAttribute('viewBox').split(' ')[3]);
      const grids = [...svg.querySelectorAll('.draft-plot-gridline')];
      const expected = [(Number(grids[0].getAttribute('x1')) + Number(grids[0].getAttribute('x2'))) / 2,
        Number(grids.at(-1).getAttribute('y1'))];
      for (const [index, point] of styled.points.entries()) {
        const node = marker(document, point.id);
        assertSameCenter(centerOf(node), expected);
        assert.equal(node.getAttribute('fill'), index < 2 ? 'none' : point.color);
        assert.equal(node.getAttribute('stroke'), index < 2 ? point.color : 'var(--surface)');
        assert.equal(node.getAttribute('pointer-events'), index < 2 ? 'stroke' : null);
        const leader = document.querySelector(`[data-annotation-leader="${point.id}"]`);
        assertSameCenter([Number(leader.getAttribute('x1')), Number(leader.getAttribute('y1'))], expected);
        const key = document.querySelector(`[data-annotation-key="${point.id}"] rect`);
        assert.ok(Number(key.getAttribute('x')) >= 0 && Number(key.getAttribute('x')) + Number(key.getAttribute('width')) <= width);
        assert.ok(Number(key.getAttribute('y')) >= 0 && Number(key.getAttribute('y')) + Number(key.getAttribute('height')) <= height);
        await act(async () => node.focus());
        assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
      }
    }
  } finally { await cleanup(); delete globalThis.ResizeObserver; }
});

test('omitting styles retains existing circle selectors and palette colors', () => {
  const defaults = { ...plot, points: plot.points.map((point, index) => ({ ...point, group: ['Human', 'Mouse', 'Other dataset'][index] })) };
  const dom = render(defaults);
  try {
    const document = dom.window.document;
    assert.equal(document.querySelectorAll('circle[data-source-observation]').length, defaults.points.length);
    for (const [index, point] of defaults.points.entries()) {
      const circle = marker(document, point.id);
      assert.equal(circle.getAttribute('r'), '6');
      assert.equal(circle.getAttribute('fill'), ['#9275ca', '#3b8b62', '#9275ca'][index]);
      assert.equal(circle.getAttribute('stroke'), 'var(--surface)');
      assert.equal(circle.getAttribute('role'), 'button');
      assert.equal(circle.getAttribute('tabindex'), '0');
    }
    const legend = document.querySelector('[data-draft-group-legend]');
    assert.deepEqual([...legend.querySelectorAll('li')].map(li => li.textContent.trim()), ['● Human', '● Mouse', '● Other dataset']);
    assert.equal(legend.querySelector('svg'), null, 'Unstyled charts retain their existing legend markup');
  } finally { dom.window.close(); }
});
