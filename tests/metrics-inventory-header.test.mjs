import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlateHero } from '../src/components/plate-header.tsx';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { DRAFT_CHART_CATEGORIES } from '../src/data/draft-charts.ts';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
globalThis.React = React;

test('Field velocity hero summarizes the complete curated Metrics inventory, not the former five-family subset', () => {
  const evidence = Object.values(DRAFT_CHART_EVIDENCE);
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const hero = Page().props.children[0];
  assert.deepEqual(hero.props.stats, [
    { value: String(DRAFT_CHART_CATEGORIES.length), label: 'scientific categories' },
    { value: String(evidence.reduce((sum, item) => sum + item.plots.length, 0)), label: 'curated numeric panels' },
    { value: String(evidence.reduce((sum, item) => sum + item.plots.reduce((total, plot) => total + plot.points.length, 0), 0)), label: 'observations' },
    { value: String(evidence.filter(item => item.timeline).length), label: 'event timeline' },
  ]);
  assert.equal(hero.props.status, undefined, 'Field velocity has no page-wide coverage badge');
  assert.doesNotMatch(renderToStaticMarkup(hero), /Partial public coverage|evidence gaps|not a live feed|single global growth rate/);
});

test('PlateHero keeps explicit status badges on other pages', () => {
  for (const [status, label] of [['partial', 'Partial public coverage'], ['live', 'Live'], ['planned', 'Coming soon']]) {
    const html = renderToStaticMarkup(React.createElement(PlateHero, { kicker: 'Test', title: 'Test', description: 'Test', stats: [], status }));
    assert.ok(html.includes(label));
  }
});
