import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneSourceContext } from '../src/components/milestone-source-context.tsx';
import rows from '../src/data/milestones.json' with { type: 'json' };
import { capitalExclusionLabel } from '../src/lib/funding-capital.mjs';
import * as PageModule from '../src/app/milestones/page.tsx';
const MilestonesPage = PageModule.default?.default ?? PageModule.default;

globalThis.React = React;

test('an undated grant source renders its actual unknown date without a fabricated time value', () => {
  const row = rows.find(r => r.date === null);
  assert.ok(row, 'Use an actual source-backed undated record');
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneSourceContext, { source: row.sourceUrl })));
  try {
    const context = dom.window.document.querySelector('#source-context');
    assert.ok(context.textContent.includes(row.company));
    assert.ok(context.textContent.includes(row.note));
    assert.match(context.textContent, /Date unverified/);
    assert.equal(context.querySelector('time'), null);
    assert.equal(context.querySelector('a').href, row.sourceUrl);
  } finally { dom.window.close(); }
});

test('the Milestones coverage year count omits the undated shelf', async () => {
  const html = renderToStaticMarkup(await MilestonesPage({}));
  const years = new Set(rows.filter(r => r.date).map(r => r.date.slice(0,4))).size;
  assert.equal(html.includes(`${years} years`), true, 'Coverage counts only actual dated years');
});

test('an overlapping disclosure label describes financing overlap without inferring conversion', () => {
  const row = rows.find(r => r.slug === 'nia-therapeutics' && r.capitalTreatment === 'overlap-unresolved');
  assert.ok(row, 'Use the actual press-to-offering mapping gap');
  assert.equal(capitalExclusionLabel(row), 'Excluded from indexed total — financing overlap unresolved');
});
