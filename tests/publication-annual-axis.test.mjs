import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { PublicationCharts, publicationExportNotes } from '../src/components/publication-charts.tsx';
import { parsePublicationSnapshot, selectPublicationCharts } from '../src/lib/publication-data.ts';
import { syntheticPublicationSnapshot, fixtureOptions } from './fixtures/publication-synthetic.mjs';
import { mount, click } from './modal-helpers.mjs';
import { buildChartImage } from '../src/lib/chart-export.ts';
globalThis.React = React;
const chart = snapshot => React.createElement(PublicationCharts, { snapshot, allowTestFixture: true });
const annualSvg = () => document.querySelector('dialog .publication-full-plot svg');
const points = element => element.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));

test('annual dual axes lock the science index to the actual 2022 count with an explicit shared anchor', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const cleanup = await mount(chart(snapshot), '#publication-output');
  try {
    for (const svg of [annualSvg(), document.querySelector('.publication-preview-0 svg')]) {
      const paperAxis = svg.querySelector('[data-annual-axis="neurotech"]');
      const scienceAxis = svg.querySelector('[data-annual-axis="science"]');
      assert.ok(paperAxis, 'The left axis needs an explicit paper-count label');
      assert.ok(scienceAxis, 'The right axis needs an explicit science-index label');
      assert.match(paperAxis.textContent, /papers/i);
      assert.match(scienceAxis.textContent, /Science index/);
      assert.match(svg.textContent, /2022 = 100/);
      const anchor = svg.querySelector('[data-annual-anchor]');
      assert.ok(anchor, 'The common 2022 position must be visible without interaction');
      assert.match(anchor.textContent, svg === annualSvg() ? /2022.*220.*100/ : /2022.*100/);
      const actual = svg.querySelector('circle[data-year="2022"][data-value="220"]');
      const science = points(svg.querySelector('polyline[data-science-context]'))[0];
      assert.equal(science[0], Number(actual.getAttribute('cx')));
      assert.equal(science[1], Number(actual.getAttribute('cy')), 'Both lines intersect exactly at the actual 2022 count');
      const left = [...svg.querySelectorAll('[data-annual-paper-tick]')];
      const right = [...svg.querySelectorAll('[data-annual-index-tick]')];
      const zeroY = Number(left[0].getAttribute('y'));
      const scale = (zeroY - Number(left.at(-1).getAttribute('y'))) / Number(left.at(-1).dataset.annualPaperTick);
      assert.ok(right.length > 1);
      for (const tick of right) {
        const lockedY = zeroY - Number(tick.dataset.annualIndexTick) / 100 * 220 * scale;
        assert.ok(Math.abs(Number(tick.getAttribute('y')) - lockedY) < 1e-9, 'Every index tick uses the paper axis mapping');
      }
    }
    const plotted = [...annualSvg().querySelectorAll('circle[data-year][data-value]')].map(mark => [mark.dataset.year, Number(mark.dataset.value)]);
    assert.deepEqual(plotted, snapshot.tables.nt_yearly.rows.filter(row => row[1] === 'Neurotech papers').map(row => [row[0], row[2]]));
  } finally { await cleanup(); }
});


test('preview, modal and image export label absolute papers versus science-index units', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const cleanup = await mount(chart(snapshot), '#publication-output');
  try {
    const legend = document.querySelector('dialog .publication-legend').textContent;
    assert.match(legend, /Neurotech.*left.*papers/i);
    assert.match(legend, /All research.*right.*index/i);
    assert.match(legend, /four-domain.*index/i);
    assert.match(legend, /2022 = 100/);
    const preview = document.querySelector('.publication-preview-0 + .publication-preview-note').textContent;
    assert.match(preview, /papers.*index.*2022 = 100/i);
    const notes = publicationExportNotes(0, parsed, selectPublicationCharts(parsed));
    const image = buildChartImage({ svg: annualSvg(), title: 'Annual test', anchor: 'publication-output', notes }, window.location.href);
    assert.match(image.svg, /Neurotech papers/);
    assert.match(image.svg, /Science index.*2022 = 100/);
    assert.match(notes.join(' '), /actual 2022 neurotech count.*220/);
    assert.match(notes.join(' '), /right axis.*locked/i);
    assert.doesNotMatch(notes.join(' '), /values are growth-equivalent paper counts/);
    for (const expected of ['https://api.openalex.org', '2026-11-05', '2026-11-06', '2025-12-31', 'atlas-primary-publications-v1']) assert.ok(notes.join(' ').includes(expected));
  } finally { await cleanup(); }
});


test('annual preview fits its card with readable axes while the enlarged plot scrolls internally', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/components/publication-charts.css', import.meta.url), 'utf8');
  const cleanup = await mount(chart(syntheticPublicationSnapshot()), '#publication-output', window => {
    window.SVGElement.prototype.getBoundingClientRect = () => ({ width: 232, height: 210, left: 0, top: 0 });
  });
  try {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
    const preview = document.querySelector('.publication-preview-0');
    const button = preview.querySelector('.publication-preview-trigger');
    assert.ok(parseFloat(getComputedStyle(button).minWidth) <= 232, 'The preview keeps both axes in the card instead of adding a second horizontal scroller');
    assert.equal(getComputedStyle(preview).overflow, 'auto');
    assert.ok(parseFloat(getComputedStyle(annualSvg()).minWidth) >= 840, 'The complete plot keeps its readable full-width axis/tooltip layout');
    const svg = preview.querySelector('svg');
    const width = Number(svg.getAttribute('viewBox').split(' ')[2]);
    assert.ok(parseFloat(svg.style.fontSize) * 232 / width >= 11 - 1e-9);
    assert.ok(parseFloat(annualSvg().style.fontSize) >= 13);
    const grids=[...svg.querySelectorAll('line')];
    assert.ok(Math.abs(+grids[0].getAttribute('y1')- +grids[4].getAttribute('y1'))*232/width >= 95, 'Preview reserves a meaningful 95px+ plot height');
    assert.ok(svg.querySelector('[data-annual-anchor] text').textContent.length <= 28, 'Compact anchor text fits at readable font sizes');
  } finally { await cleanup(); }
});


test('a zero 2022 paper count keeps actuals visible and explicitly withholds undefined science indices', async () => {
  const snapshot = syntheticPublicationSnapshot();
  for (const row of snapshot.tables.nt_yearly.rows) if (row[0] === '2022') row[2] = 0;
  const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
  const cleanup = await mount(chart(snapshot), '#publication-output');
  try {
    const svg = annualSvg();
    assert.equal(svg.querySelectorAll('[data-science-context], [data-annual-index-tick], [data-annual-axis="science"], [data-annual-anchor]').length, 0);
    assert.equal(svg.querySelectorAll('circle[data-year][data-value]').length, 16);
    assert.equal(svg.querySelector('[data-year="2022"]').dataset.value, '0');
    assert.doesNotMatch(svg.outerHTML, /NaN|Infinity/);
    const modal = document.querySelector('dialog');
    assert.match(modal.textContent, /Science index unavailable.*2022.*zero/i);
    assert.doesNotMatch(modal.querySelector('.publication-legend').textContent, /All research|band|2022 = 100/);
    assert.match(document.querySelector('.publication-preview-0 + .publication-preview-note').textContent, /index unavailable/i);
    const notes = publicationExportNotes(0, parsed, selectPublicationCharts(parsed)).join(' ');
    assert.match(notes, /Science index unavailable.*2022.*zero/i);
    assert.doesNotMatch(notes, /divided by|right axis is mathematically locked/);
  } finally { await cleanup(); }
});


test('selecting either series shows one shared-year tooltip, colored keys and a dashed year guide', async () => {
  const snapshot = syntheticPublicationSnapshot();
  const cleanup = await mount(chart(snapshot), '#publication-output');
  try {
    const svg = annualSvg();
    const mark = svg.querySelector('circle[data-year="2023"][data-value]');
    await act(async () => mark.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    const tooltip = svg.querySelector('[data-annual-tooltip]');
    assert.ok(tooltip, 'A selected year needs one tooltip containing all available series');
    assert.equal(svg.querySelectorAll('[role="tooltip"]').length, 1);
    assert.equal(tooltip.dataset.annualTooltip, '2023');
    for (const expected of ['2023', 'Neurotech papers', '230', 'All research index', '103.6', 'Four-domain index', '102.3–105.5', '2022 = 100']) assert.ok(tooltip.textContent.includes(expected), expected);
    const keys = [...tooltip.querySelectorAll('[data-annual-tooltip-key]')];
    assert.deepEqual(keys.map(key => key.getAttribute('fill')), ['#4b4df2', '#138a7a', '#a6b0bf']);
    const guide = svg.querySelector('[data-annual-year-guide]');
    assert.equal(guide.getAttribute('x1'), mark.getAttribute('cx'));
    assert.equal(guide.getAttribute('x2'), mark.getAttribute('cx'));
    assert.ok(guide.getAttribute('stroke-dasharray'));
    assert.match(document.querySelector('dialog [data-publication-inspector]').textContent, /2023.*230.*103.6.*102.3–105.5/);
    const science = [...svg.querySelectorAll('circle[data-publication-mark]')].find(point => point.getAttribute('fill') === '#138a7a' && point.getAttribute('cx') === mark.getAttribute('cx'));
    await act(async () => science.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(svg.querySelector('[data-annual-tooltip]').textContent, tooltip.textContent);
    assert.equal(svg.querySelectorAll('circle > title').length, 0, 'Per-series native popovers must not compete with the year tooltip');
    const parsed = parsePublicationSnapshot(snapshot, fixtureOptions);
    const image = buildChartImage({ svg, title: 'Annual test', anchor: 'publication-output', notes: publicationExportNotes(0, parsed, selectPublicationCharts(parsed)) }, window.location.href);
    assert.doesNotMatch(image.svg, /Neurotech papers230|All research index103.6/);
    assert.equal(guide.hasAttribute('data-export-exclude'), true, 'An interaction guide is not part of the source-qualified PNG');
  } finally { await cleanup(); }
});


test('year-wide hit areas require real pointer movement and share focus, keyboard and touch-click selection', async () => {
  const cleanup = await mount(chart(syntheticPublicationSnapshot()));
  try {
    await click(document.querySelector('[data-publication-card="publication-output"] .pc-trigger'));
    const svg = annualSvg(), readout = document.querySelector('dialog [data-publication-inspector]');
    const target = svg.querySelector('[data-annual-year-target="2022"]');
    assert.ok(target, 'A year is selectable throughout its plot column, not only on tiny dots');
    assert.equal(readout.textContent, '');
    assert.equal(svg.querySelector('[data-annual-tooltip]'), null);
    const move = async (element, movementX, movementY) => act(async () => {
      const event = new window.MouseEvent('pointermove', { bubbles: true });
      Object.defineProperties(event, { movementX: { value: movementX }, movementY: { value: movementY } });
      element.dispatchEvent(event);
    });
    await act(async () => target.dispatchEvent(new window.MouseEvent('pointerover', { bubbles: true })));
    await move(target, 0, 0);
    assert.equal(readout.textContent, '', 'A stationary pointer over a newly opened modal stays unselected');
    assert.equal(svg.querySelector('[data-annual-tooltip]'), null);
    await move(target, 1, 0);
    assert.equal(svg.querySelector('[data-annual-tooltip]').dataset.annualTooltip, '2022');
    assert.match(readout.textContent, /2022.*220.*100.*100–100/);
    const focusMark = svg.querySelector('circle[data-year="2015"]');
    await act(async () => focusMark.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true })));
    assert.equal(svg.querySelector('[data-annual-tooltip]').dataset.annualTooltip, '2015');
    assert.match(readout.textContent, /2015.*150.*unavailable/);
    assert.equal(svg.querySelectorAll('[data-annual-tooltip-key]').length, 1, 'Legacy baseline years are not backfilled in the inspector');
    const keyboardMark = svg.querySelector('circle[data-year="2025"]');
    await act(async () => keyboardMark.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(svg.querySelector('[data-annual-tooltip]').dataset.annualTooltip, '2025');
    await act(async () => svg.querySelector('[data-annual-year-target="2024"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
    assert.equal(svg.querySelector('[data-annual-tooltip]').dataset.annualTooltip, '2024');
    await act(async () => keyboardMark.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    assert.equal(svg.querySelector('[data-annual-tooltip]').dataset.annualTooltip, '2025');
    assert.equal(svg.querySelectorAll('[data-annual-tooltip]').length, 1);
  } finally { await cleanup(); }
});


test('science axis uses clean independent index ticks while retaining the locked 2022 scale', async () => {
  const cleanup = await mount(chart(syntheticPublicationSnapshot()), '#publication-output');
  try {
    assert.deepEqual([...annualSvg().querySelectorAll('[data-annual-index-tick]')].map(tick => Number(tick.dataset.annualIndexTick)), [0, 50, 100]);
    const tick100 = annualSvg().querySelector('[data-annual-index-tick="100"]');
    assert.equal(tick100.getAttribute('y'), String(Number(annualSvg().querySelector('circle[data-year="2022"]').getAttribute('cy')) + 4));
  } finally { await cleanup(); }
});

test('compact axis headings stay short and keep the 2022 index unit visible separately', async () => {
  const cleanup = await mount(chart(syntheticPublicationSnapshot()));
  try {
    const svg = document.querySelector('.publication-preview-0 svg');
    assert.equal(svg.querySelector('[data-annual-axis="neurotech"]').textContent, 'Papers');
    assert.equal(svg.querySelector('[data-annual-axis="science"]').textContent, 'Science index');
    assert.equal(svg.querySelector('[data-annual-index-unit]').textContent, '2022 = 100');
  } finally { await cleanup(); }
});


test('axis colors remain tied to their series despite shared SVG text theme rules',async()=>{
 const cleanup=await mount(chart(syntheticPublicationSnapshot()),'#publication-output');
 try {
  const style=document.createElement('style');style.textContent='.publication-full-plot svg text, .publication-preview svg text {fill:var(--foreground)}';document.head.append(style);
  for(const svg of [annualSvg(),document.querySelector('.publication-preview-0 svg')]) {
   assert.equal(getComputedStyle(svg.querySelector('[data-annual-axis="neurotech"]')).fill,'rgb(75, 77, 242)');
   assert.equal(getComputedStyle(svg.querySelector('[data-annual-axis="science"]')).fill,'rgb(19, 138, 122)');
  }
 } finally {await cleanup();}
});
