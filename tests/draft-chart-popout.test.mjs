import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { DraftChartPlot, DraftEventTimeline } from '../src/components/draft-chart-plot.tsx';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';
import { mount, click, settle } from './modal-helpers.mjs';

globalThis.React = React;
const plot = METRIC_CHART_EVIDENCE['Neural recording hours collected over time'].plots[0];
const timeline = METRIC_CHART_EVIDENCE['Demonstrated applications enabled by connectomics over time'].timeline;
const anchor = 'metric-recording-hours';
const aliases = ['draft-recording-hours', 'draft-panel-tusz-scalp-eeg', 'metric-panel-tusz-scalp-eeg', 'neural-recording-hours'];

test('numeric preview keeps real glyph coordinates/colors but mounts no nested controls, source table or inspector', () => {
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot, preview: true, shareAnchor: anchor }))).window.document;
  const full = new JSDOM(renderToStaticMarkup(React.createElement(DraftChartPlot, { plot }))).window.document;
  assert.equal(doc.querySelectorAll('[data-source-observation]').length, plot.points.length);
  assert.equal(doc.querySelector('button, a, [tabindex], [role="button"], details, .draft-plot-inspector, [data-chart-share]'), null);
  for (const point of plot.points) {
    const selector = `[data-source-observation="${point.id}"]`;
    for (const attr of ['cx', 'cy', 'fill', 'stroke', 'points', 'x', 'y']) assert.equal(doc.querySelector(selector).getAttribute(attr), full.querySelector(selector).getAttribute(attr));
  }
  assert.ok(doc.querySelector('[data-draft-preview]'));
});

test('timeline preview retains the real dated events without its detailed source list', () => {
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(DraftEventTimeline, { timeline, preview: true }))).window.document;
  assert.equal(doc.querySelectorAll('[data-source-event]').length, timeline.events.length);
  assert.equal(doc.querySelector('a, button, [tabindex], .draft-event-list'), null);
  assert.ok(doc.querySelector('[data-draft-preview]'));
});

async function panels() {
  const module = await import('../src/components/draft-chart-panel.tsx').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(typeof module.DraftChartPanel, 'function', 'Curated charts need a real preview/popup component');
  return module;
}
async function until(predicate) {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt++) await settle();
  assert.ok(predicate(), 'Expected navigation/focus state settled');
}

test('whole-card native button opens one URL-addressed full plot and Close returns through history without scroll', async () => {
  const { DraftChartPanel } = await panels();
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor, aliases }), '', win => {
    win.history.replaceState({ routerSentinel: 'keep-me' }, '', '/neuro-atlas/field-velocity?review=1');
  });
  try {
    const trigger = document.querySelector(`[data-draft-popout-trigger="${anchor}"]`);
    assert.equal(trigger?.tagName, 'BUTTON');
    assert.equal(trigger.type, 'button');
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(trigger.querySelector('a, button, [tabindex]'), null);
    assert.equal(document.querySelector('dialog, .draft-plot-inspector'), null);
    assert.equal(document.querySelectorAll('[data-source-observation]').length, plot.points.length);
    const original = window.location.href;
    await act(async () => trigger.focus());
    await click(trigger);
    const modal = document.querySelector('dialog[open]');
    assert.ok(modal);
    assert.equal(window.location.hash, `#${anchor}`);
    assert.equal(window.location.pathname, '/neuro-atlas/field-velocity');
    assert.equal(window.location.search, '?review=1');
    assert.equal(window.history.state.atlasModalFrom, original);
    assert.equal(window.history.state.routerSentinel, 'keep-me');
    assert.equal(document.activeElement, modal.querySelector('.pc-modal-header button'));
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, plot.points.length);
    assert.equal(modal.querySelectorAll('tbody tr').length, plot.points.length);
    assert.equal(modal.querySelector('.draft-plot-inspector').textContent, '');
    assert.ok(modal.querySelector('[data-copy-chart]'));
    assert.ok(modal.querySelector('[data-download-chart]'));
    assert.ok(modal.querySelector(`a[href="#${anchor}"]`));
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    assert.equal(new Set(ids).size, ids.length);
    await click(modal.querySelector('.pc-modal-header button'));
    await until(() => !document.querySelector('dialog[open]'));
    assert.equal(window.location.href, original);
    assert.equal(document.activeElement, trigger);
    await act(async () => window.history.forward());
    await until(() => document.querySelector('dialog[open]'));
    assert.equal(window.location.hash, `#${anchor}`);
    await act(async () => document.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await until(() => !document.querySelector('dialog[open]'));
    assert.equal(window.location.href, original);
  } finally { await cleanup(); }
});

test('categorical timeline has the same popup contract and full export/source affordances', async () => {
  const { DraftTimelinePanel } = await panels();
  assert.equal(typeof DraftTimelinePanel, 'function');
  const anchor = 'metric-panel-application-events';
  const cleanup = await mount(React.createElement(DraftTimelinePanel, { timeline, anchor, aliases: ['draft-panel-application-events'] }));
  try {
    assert.equal(document.querySelectorAll('[data-source-event]').length, timeline.events.length);
    assert.equal(document.querySelector('.draft-event-list'), null);
    await click(document.querySelector('[data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog);
    assert.equal(dialog.querySelectorAll('[data-source-event]').length, timeline.events.length);
    assert.equal(dialog.querySelectorAll('[data-draft-event]').length, timeline.events.length);
    assert.equal(dialog.querySelectorAll('.draft-event-list a').length, timeline.events.length);
    assert.ok(dialog.querySelector('[data-download-chart]'));
    assert.ok(dialog.querySelector('[data-copy-chart]'));
    assert.ok(dialog.querySelector('[data-copy-draft-link]'));
  } finally { await cleanup(); }
});

test('preview is a visibly bounded card with a full-area native trigger and compact plot', async () => {
  const { readFileSync } = await import('node:fs');
  const { DraftChartPanel } = await panels();
  const cleanup = await mount(React.createElement(DraftChartPanel, { plot, anchor, aliases }));
  try {
    const style = document.createElement('style');
    try { style.textContent = readFileSync('src/components/draft-chart-panel.css', 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    document.head.append(style);
    const card = document.querySelector('.draft-popout-card');
    assert.equal(getComputedStyle(card).borderTopStyle, 'solid');
    assert.equal(getComputedStyle(card).borderTopWidth, '1px');
    assert.equal(getComputedStyle(card).borderRadius, '12px');
    assert.equal(getComputedStyle(card).position, 'relative');
    const trigger = document.querySelector('[data-draft-popout-trigger]');
    assert.equal(getComputedStyle(trigger).position, 'absolute');
    assert.equal(getComputedStyle(trigger).width, '100%');
    assert.equal(getComputedStyle(trigger).height, '100%');
    assert.equal(getComputedStyle(document.querySelector('.draft-popout-preview')).pointerEvents, 'none');
    assert.equal(parseFloat(getComputedStyle(document.querySelector('.draft-plot-svg')).minHeight), 0);
  } finally { await cleanup(); }
});

test('modal keyboard trap includes a closed source summary, not its hidden source controls', async () => {
  const { ChartModal } = await import('../src/components/chart-modal.tsx');
  const cleanup = await mount(React.createElement(ChartModal, { id: 'source-trap', title: plot.title, returnFocus: { current: null } },
    React.createElement(DraftChartPlot, { plot, shareAnchor: anchor })), `#${anchor}`);
  try {
    const dialog = document.querySelector('dialog');
    const close = dialog.querySelector('.pc-modal-header button');
    const details = dialog.querySelector('details');
    const summary = details.querySelector('summary');
    await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.ok(document.activeElement === summary, `Reverse Tab must wrap to visible source summary, not ${document.activeElement?.tagName}`);
    await act(async () => summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, close, 'Forward Tab wraps from the visible final control');
    await act(async () => { details.open = true; close.focus(); });
    await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(document.activeElement, [...details.querySelectorAll('a')].at(-1), 'Expanded source links become reachable');
  } finally { await cleanup(); }
});

for (const freshAnchor of [anchor, ...aliases, 'metric-panel-application-events', 'draft-panel-application-events']) {
  test(`fresh ${freshAnchor} opens only its own real modal; backdrop uses the existing fallback`, async () => {
    const { DraftChartPanel, DraftTimelinePanel } = await panels();
    const cleanup = await mount(React.createElement(React.StrictMode, null,
      React.createElement(DraftChartPanel, { plot, anchor, aliases }),
      React.createElement(DraftTimelinePanel, { timeline, anchor: 'metric-panel-application-events', aliases: ['draft-panel-application-events'] })), `#${freshAnchor}`);
    try {
      const dialogs = document.querySelectorAll('dialog[open]');
      assert.equal(dialogs.length, 1);
      const expected = freshAnchor.includes('application-events') ? timeline.events.length : plot.points.length;
      assert.equal(dialogs[0].querySelectorAll('[data-source-observation], [data-source-event]').length, expected);
      assert.ok(document.activeElement === dialogs[0].querySelector('.pc-modal-header button'));
      await click(dialogs[0]);
      assert.equal(document.querySelector('dialog[open]'), null);
      assert.equal(window.location.hash, '#performance_curves');
    } finally { await cleanup(); }
  });
}

test('only registered curated popup targets skip inline reveal; retired links retain scrolling', async () => {
  const { DraftChartPanel } = await panels();
  const { navigatePerformance, revealDraftTarget } = await import('../src/lib/field-velocity/navigation.ts');
  let scrolled = [];
  const cleanup = await mount(React.createElement(React.Fragment, null,
    React.createElement('span', { id: anchor }),
    React.createElement('span', { id: 'metric-mapping-cost' }),
    React.createElement(DraftChartPanel, { plot, anchor, aliases })), '', win => {
      win.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  });
  try {
    await act(async () => navigatePerformance(anchor));
    revealDraftTarget(anchor);
    await settle(); await settle();
    assert.deepEqual(scrolled, []);
    await act(async () => navigatePerformance(anchor)); // explicit same-hash Direct link
    await settle(); await settle();
    assert.deepEqual(scrolled, []);
    await act(async () => navigatePerformance('metric-mapping-cost'));
    assert.equal(window.history.state.atlasModalFrom, null);
    revealDraftTarget('metric-mapping-cost');
    await settle(); await settle();
    assert.deepEqual(scrolled, ['metric-mapping-cost']);
    assert.equal(document.querySelector('dialog[open]'), null);
  } finally { await cleanup(); }
});

for (const hash of ['metric-recording-hours', 'draft-panel-japaneeg-scalp-eeg', 'neural-recording-hours', 'tissue-mapped', 'metric-panel-acquisition-economics', 'metric-neuroai-frontier', 'draft-panel-application-events']) {
  test(`real page fresh ${hash} reveals its category before native modal focus`, async () => {
    const module = await import('../src/app/field-velocity/page.tsx');
    const Page = module.default.default ?? module.default;
    const cleanup = await mount(React.createElement(React.StrictMode, null, React.createElement(Page)), `#${hash}`, win => {
      const focus = win.HTMLElement.prototype.focus;
      win.HTMLElement.prototype.focus = function(options) { if (!this.closest('[hidden]')) focus.call(this, options); };
    });
    try {
      await until(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Close '));
      const modal = document.querySelector('dialog[open]');
      assert.equal(document.querySelectorAll('dialog[open]').length, 1);
      assert.equal(modal.closest('[hidden]'), null);
      assert.ok(modal.querySelector('.draft-popout-detail'));
      await act(async () => modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
      await until(() => !document.querySelector('dialog[open]'));
      assert.equal(window.location.hash, '#performance_curves');
      assert.equal(document.querySelector('.draft-plot-inspector'), null);
    } finally { await cleanup(); }
  });
}

for (const strict of [false, true]) {
  test(`curated cross-tab popup restores the real Expectations link after Close and Forward (StrictMode=${strict})`, async () => {
    const module = await import('../src/app/field-velocity/page.tsx');
    const Page = module.default.default ?? module.default;
    const page = React.createElement(Page);
    const cleanup = await mount(strict ? React.createElement(React.StrictMode, null, page) : page, '#expectations', win => {
      const focus = win.HTMLElement.prototype.focus;
      win.HTMLElement.prototype.focus = function(options) {
        const modal = win.document.querySelector('dialog[open]');
        // Native top-layer modality rejects attempts to focus background headings.
        if (!this.closest('[hidden]') && (!modal || modal.contains(this))) focus.call(this, options);
      };
      win.HTMLElement.prototype.scrollIntoView = function() {
        assert.ok(this.matches('[data-related-measurement]'), 'Only existing Expectations return-focus behavior may scroll, never the modal target');
      };
    });
    try {
      const link = document.querySelector('[data-related-measurement="metric-recording-hours"]');
      assert.ok(link);
      await act(async () => link.focus());
      await click(link);
      await until(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Close '));
      assert.equal(document.querySelectorAll('dialog[open]').length, 1);
      assert.equal(document.querySelector('dialog').querySelectorAll('[data-source-observation]').length, plot.points.length);
      await click(document.querySelector('dialog .pc-modal-header button'));
      await until(() => window.location.hash === '#expectations' && document.activeElement === link);
      assert.equal(document.querySelector('dialog'), null);
      await act(async () => window.history.forward());
      await until(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Close '));
      await click(document.querySelector('dialog .pc-modal-header button'));
      await until(() => window.location.hash === '#expectations' && document.activeElement === link);
    } finally { await cleanup(); }
  });
}
