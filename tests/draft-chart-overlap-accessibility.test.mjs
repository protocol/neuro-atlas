import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { mount } from './modal-helpers.mjs';
import { DraftChartPlot } from '../src/components/draft-chart-plot.tsx';

globalThis.React = React;
const original = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'))['Brain tissue mapped over time'].plots[0];
const tissue = { ...original, points: original.points.map(point => ({ ...point, annotation: undefined })) };
const pair = ['h01-human-imaged-2021-06-01', 'microns-mouse-imaged-2021-07-01'];

test('both overlapping observations get separate persistent labels and source inspection even without authored annotations', async () => {
  const cleanup = await mount(React.createElement(DraftChartPlot, { plot: tissue }));
  try {
    for (const id of pair) {
      const point = tissue.points.find(point => point.id === id);
      const label = document.querySelector(`[data-point-annotation="${id}"]`);
      assert.ok(label, `${point.label} needs its own persistent, operable label`);
      for (const text of [point.label, point.group, '≈0.001']) assert.ok(label.textContent.includes(text), text);
      const key = document.querySelector(`[data-annotation-key="${id}"]`);
      assert.equal(key.querySelector('text').textContent, label.querySelector('.draft-annotation-number').textContent);
      const circle = document.querySelector(`circle[data-source-observation="${id}"]`);
      const leader = document.querySelector(`[data-annotation-leader="${id}"]`);
      assert.equal(leader.getAttribute('x1'), circle.getAttribute('cx'));
      assert.equal(leader.getAttribute('y1'), circle.getAttribute('cy'));
      await act(async () => label.click());
      assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
      await act(async () => circle.focus());
      assert.equal(document.querySelector('[role="tooltip"] a').href, point.sourceUrl);
    }
    const keys = pair.map(id => document.querySelector(`[data-annotation-key="${id}"] rect`));
    assert.notEqual(keys[0].getAttribute('x'), keys[1].getAttribute('x'), 'Keys distinguish the two nearby positions');
  } finally { await cleanup(); }
});
