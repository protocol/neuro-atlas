import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlateHero } from '../src/components/plate-header.tsx';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';

globalThis.React = React;

test('Field velocity hero stays focused on charts, without inventory KPI tiles', () => {
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const hero = Page().props.children[0];
  assert.deepEqual(hero.props.stats, []);
  assert.equal(hero.props.status, undefined, 'Field velocity has no page-wide coverage badge');
  assert.doesNotMatch(renderToStaticMarkup(hero), /metric groups|curated numeric panels|observations|event timeline|Partial public coverage|evidence gaps|not a live feed|single global growth rate/);
});

test('PlateHero keeps explicit status badges on other pages', () => {
  for (const [status, label] of [['partial', 'Partial public coverage'], ['live', 'Live'], ['planned', 'Coming soon']]) {
    const html = renderToStaticMarkup(React.createElement(PlateHero, { kicker: 'Test', title: 'Test', description: 'Test', stats: [], status }));
    assert.ok(html.includes(label));
  }
});
