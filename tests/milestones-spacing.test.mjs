import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MilestonesSection } from '../src/components/sections/milestones-section.tsx';
import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

globalThis.React = React;

// Compile the real component's Tailwind utilities, rather than imitating .hidden.
// jsdom has no box layout engine and does not cascade @layer, so unwrap layers;
// this checks layout participation, while native QA measures the actual gaps.
const styles = await postcss([tailwind()]).process(
  '@import "tailwindcss" source(none); @source "../src/components/milestone-timeline.tsx";',
  { from: fileURLToPath(new URL('./milestones-spacing.css', import.meta.url)) },
);
styles.root.walkAtRules('layer', rule => rule.replaceWith(...(rule.nodes ?? [])));

async function mount(t) {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'https://atlas.example/milestones', pretendToBeVisual: true,
  });
  const style = dom.window.document.createElement('style');
  style.textContent = styles.root.toString();
  dom.window.document.head.append(style);
  const keys = ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'];
  const originals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(dom.window.document.getElementById('root'));
  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await act(async () => root.render(React.createElement(MilestoneTimeline)));
  return dom.window;
}

test('collapsed stage subcategories occupy no layout space before opening or after closing', async t => {
  const window = await mount(t);
  const stageButtons = [...window.document.querySelectorAll('button[aria-expanded]')];
  assert.equal(stageButtons.length, 3);
  const assertCollapsed = () => {
    for (const button of stageButtons) {
      assert.equal(button.getAttribute('aria-expanded'), 'false');
      const panel = button.nextElementSibling;
      assert.ok(!panel || window.getComputedStyle(panel).display === 'none',
        `${button.textContent.trim()}: invisible wrapped subcategories must not stretch the filter row`);
    }
  };
  assertCollapsed();
  for (const button of stageButtons) {
    await act(async () => button.click());
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    const panel = button.nextElementSibling;
    assert.ok(panel.querySelectorAll('button[aria-pressed]').length > 0);
    assert.notEqual(window.getComputedStyle(panel).display, 'none');
    await act(async () => panel.querySelector('button[aria-label^="Collapse "]').click());
    assertCollapsed();
  }
});

test('Milestone timeline intro renders exactly the owner-approved replacement paragraph', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestonesSection)));
  try {
    const heading = [...dom.window.document.querySelectorAll('h2')].find(el => el.textContent === 'Milestone timeline');
    assert.ok(heading);
    assert.equal(heading.nextElementSibling.textContent,
      'Tracked deals, partnerships, first-in-human trials, and regulatory milestones across neural interfaces and neurotechnology. Filter by BCI only or view the broader neurotech ecosystem. Click a year to put it into focus.');
  } finally {
    dom.window.close();
  }
});

test('Milestones omits the entire Memo cut comparison while retaining the sourced capital panel', () => {
  const memo = JSON.parse(readFileSync(new URL('../src/data/capital.json', import.meta.url), 'utf8'));
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const panel = dom.window.document.querySelector('aside');
    assert.ok(panel);
    assert.doesNotMatch(panel.textContent, /Memo cut|Naveen’s Q1\+ 2026 chart|Independent of the dots/);
    const rowTexts = [...panel.querySelectorAll('div')].map(el => el.textContent);
    for (const { year, usdM } of memo) {
      assert.ok(!rowTexts.includes(`${year}$${usdM}m`), `Remove the ${year} memo comparison amount`);
    }
    assert.match(panel.textContent, /Capital raised/);
    assert.match(panel.textContent, /Sourced round sizes on this lane/);
    assert.match(panel.textContent, /Full period/);
    assert.ok(panel.querySelector('button[aria-label="Fold side panel to show the full year"]'));
  } finally {
    dom.window.close();
  }
});
