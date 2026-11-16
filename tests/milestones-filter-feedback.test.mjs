import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

globalThis.React = React;
test('category disclosure identifies its panel and preserves real filtering across open/switch/close', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://atlas.example/milestones', pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => root.render(React.createElement(MilestoneTimeline)));
    const triggers = [...document.querySelectorAll('button[aria-expanded]')];
    assert.equal(triggers.length, 3);
    const markerNames = () => [...document.querySelectorAll('.milestone-year-scroll a[aria-label]')].map(e => e.getAttribute('aria-label'));
    const original = markerNames();
    for (const trigger of triggers) {
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      assert.ok(panel, 'disclosure must name its existing subcategory panel');
      assert.ok(trigger.querySelector('.milestone-filter-chevron'), 'closed/open share the same animated indicator');
      assert.ok(panel.classList.contains('hidden'), 'closed options leave layout and keyboard navigation');
      await act(async () => trigger.click());
      assert.equal(trigger.getAttribute('aria-expanded'), 'true');
      assert.ok(!panel.classList.contains('hidden'));
      assert.equal(triggers.filter(e => e.getAttribute('aria-expanded') === 'true').length, 1);
      assert.deepEqual(markerNames(), original, 'opening a disclosure never changes selection');
    }
    const capital = triggers[0];
    await act(async () => capital.click());
    const panel = document.getElementById(capital.getAttribute('aria-controls'));
    const options = () => [...panel.querySelectorAll('button[aria-pressed]')];
    await act(async () => capital.click());
    assert.ok(options().every(e => e.getAttribute('aria-pressed') === 'false'), 'repeat category click retains clear-all semantics');
    assert.ok(markerNames().length < original.length, 'clear-all removes actual capital markers');
    const amount = options().find(e => e.textContent.startsWith('$ amount'));
    await act(async () => amount.click());
    assert.equal(amount.getAttribute('aria-pressed'), 'true');
    assert.ok(markerNames().some(name => name.includes(' — $')), 'individual option restores matching markers');
    await act(async () => panel.querySelector('button[title="Collapse"]').click());
    assert.equal(capital.getAttribute('aria-expanded'), 'false');
    await act(async () => capital.click());
    assert.equal(amount.getAttribute('aria-pressed'), 'true', 'collapse/reopen retains selection');
    await act(async () => capital.click());
    assert.deepEqual(markerNames(), original, 'partial selection -> category click restores all');
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});

test('filter feedback is bounded, motion-safe, and above the overlapping timeline hit layer', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/components/milestone-timeline.tsx', import.meta.url), 'utf8');
  assert.match(source, /className="relative z-10 mb-3 flex flex-wrap items-center gap-2"/, 'timeline padding must not intercept category clicks');
  assert.match(css, /\.milestone-filter-chevron\s*\{[^}]*transition:\s*transform 120ms ease-out/s);
  assert.match(css, /\[aria-expanded="true"\] > \.milestone-filter-chevron\s*\{[^}]*rotate\(90deg\)/s);
  assert.match(css, /\.milestone-filter-options[^}]*animation:\s*milestone-filter-reveal 120ms ease-out/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.milestone-filter-chevron[^}]*transition: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.milestone-filter-options:not\(\.hidden\)[^}]*animation: none/, 'reduced-motion override must match the reveal selector specificity');
});
