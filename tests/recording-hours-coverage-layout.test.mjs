import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const title = 'Neural recording hours collected over time';
const points = METRIC_CHART_EVIDENCE[title].plots[0].points;
const css = readFileSync(new URL('../src/components/draft-chart-plot.css', import.meta.url), 'utf8');
const app = () => React.createElement('div', { className: 'metrics-index' }, React.createElement(DraftChartsSection, { flat: true }));
const matching = (rules, target, property, value) => [...rules].some(rule =>
  rule.selectorText && target.matches(rule.selectorText) && rule.style.getPropertyValue(property) === value);
const sheet = () => { const style = new window.CSSStyleSheet(); style.replaceSync(css); return style.cssRules; };

test('recording source rows retain exact source data in a separately scrollable, styled portal', async () => {
  const cleanup = await mount(app());
  try {
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const modal = document.querySelector('dialog[open]');
    const details = modal.querySelector('.mx-data > details');
    await click(details.querySelector('summary'));
    const region = details.querySelector('[role=region]');
    const table = region.querySelector('table');
    assert.ok(details.open && !table.closest('.draft-plot'), 'Test the actual portaled table');
    const rules = sheet();
    assert.ok(matching(rules, region, 'overflow-x', 'auto'), 'Horizontal scrolling belongs to the table region');
    assert.ok(matching(rules, table, 'min-width', '49rem'), 'The table protects its columns even when the portal is narrow');
    const rows = [...table.tBodies[0].rows];
    assert.equal(rows.length, 13);
    for (const [i, point] of points.entries()) {
      const [label, date, value, notes] = [...rows[i].cells];
      assert.equal(label.firstChild.textContent, point.label);
      assert.equal(label.querySelector('small').textContent, point.group);
      assert.ok(matching(rules, label.querySelector('small'), 'display', 'block'), 'Group is separate from the label');
      assert.equal(date.textContent, point.dateLabel);
      assert.ok(matching(rules, date, 'white-space', 'nowrap'), 'Date stays readable');
      assert.ok(matching(rules, value, 'padding', '0.65rem'), 'Numeric cells retain their padding');
      assert.match(value.textContent, /Calculated average/);
      assert.ok(!value.textContent.includes(point.recordingCoverage.detail));
      assert.ok(notes.textContent.includes(point.recordingCoverage.detail));
      assert.equal(notes.querySelector('blockquote').textContent, point.quote);
      const sources = [...notes.querySelectorAll('a')].map(a => a.href);
      for (const url of [point.sourceUrl, ...(point.supportingReferences ?? []).map(ref => ref.url)]) assert.ok(sources.includes(url));
    }
  } finally { await cleanup(); }
});

test('the narrow wrap overrides explicit button placement and bounds status only in the recording modal', async () => {
  const cleanup = await mount(app());
  try {
    await click(document.querySelector('#draft-recording-hours [data-draft-popout-trigger]'));
    const modal = document.querySelector('dialog[open]');
    const actions = modal.querySelector('.pc-modal-header .chart-actions');
    const buttons = [...actions.querySelectorAll('button')];
    const narrow = [...sheet()].find(rule => rule.conditionText === '(max-width: 400px)');
    assert.ok(narrow, 'Provide a bounded recording-only layout covering 320px and 390px');
    assert.ok(matching(narrow.cssRules, actions, 'grid-template-columns', 'repeat(2, max-content)'));
    assert.equal(buttons.length, 3);
    for (const button of buttons) {
      assert.ok(matching(narrow.cssRules, button, 'grid-area', 'auto'), `${button.textContent}: avoid an implicit third track`);
      assert.ok(matching(narrow.cssRules, button, 'min-height', '44px'), `${button.textContent}: preserve the narrow touch target`);
    }
    const statuses = [...actions.querySelectorAll('[role=status]')];
    assert.equal(statuses.length, 2);
    for (const status of statuses) {
      status.textContent = 'Action complete.';
      assert.ok(matching(narrow.cssRules, status, 'max-width', '100%'));
      assert.ok(matching(narrow.cssRules, status, 'order', '1'), 'Status stays below the buttons');
    }
    const panel = modal.closest('[data-draft-popout]');
    panel.dataset.draftPopout = 'metric-panel-unrelated';
    assert.ok(!matching(narrow.cssRules, actions, 'grid-template-columns', 'repeat(2, max-content)'), 'No override on other charts');
  } finally { await cleanup(); }
});
