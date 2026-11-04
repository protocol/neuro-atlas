import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { PerformanceCurves } from '../src/components/performance-curves.tsx';
import { selectPerformance } from '../src/lib/field-velocity/performance.ts';
import { mount } from './modal-helpers.mjs';

globalThis.React = React;
const data = selectPerformance(JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8')));
const provenance = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json.provenance.json', 'utf8'));
for (const [view, labels] of [
  ['human-channels', ['Jun 2026', 'Sep 2026']],
  ['optical', ['2024']],
  ['electrical', ['2017', '2025']],
]) test(`${view}: date ticks distinguish source dates and align with their actual coordinates`, async () => {
  const cleanup = await mount(React.createElement(PerformanceCurves, { data, provenance, flat: true, selection: ['simultaneously-recorded-neurons'] }), '', win => win.history.replaceState(null, '', `/field-velocity?recordingView=${view}#simultaneously-recorded-neurons`));
  try {
    const svg = document.querySelector('dialog [data-recording-view] svg');
    const ticks = [...svg.querySelectorAll('text')].filter(t => /^(?:[A-Z][a-z]{2} )?20\d{2}$/.test(t.textContent));
    assert.deepEqual(ticks.map(t => t.textContent), labels);
    const points = [...svg.querySelectorAll('[data-curve-point]')];
    const endpoints = points.length === 1 ? points : [points[0], points.at(-1)];
    assert.deepEqual(ticks.map(t => Number(t.getAttribute('x'))), endpoints.map(p => Number(p.getAttribute('cx'))));
  } finally { await cleanup(); }
});
