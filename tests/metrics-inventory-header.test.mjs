import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlateHero } from '../src/components/plate-header.tsx';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';
import { JSDOM } from 'jsdom';
globalThis.React = React;

test('Field velocity hero counts the rendered catalog, never the retired source archive', () => {
  const Page = FieldVelocityPage.default ?? FieldVelocityPage;
  const hero = Page().props.children[0];
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Page)));
  try {
    const doc = dom.window.document;
    const rendered = [
      doc.querySelectorAll('[data-metric-toggle]').length,
      doc.querySelectorAll('.draft-plot:not(.draft-event-timeline)').length,
      doc.querySelectorAll('[data-source-observation]').length,
      doc.querySelectorAll('.draft-event-timeline').length,
    ];
    assert.deepEqual(rendered, [5, 14, 77, 1]);
    assert.deepEqual(hero.props.stats, [
      { value: String(rendered[0]), label: 'metric groups' },
      { value: String(rendered[1]), label: 'curated numeric panels' },
      { value: String(rendered[2]), label: 'observations' },
      { value: String(rendered[3]), label: 'event timeline' },
    ]);
    assert.doesNotMatch(hero.props.description, /six scientific categories/);
    assert.equal(hero.props.status, undefined, 'Field velocity has no page-wide coverage badge');
    assert.doesNotMatch(renderToStaticMarkup(hero), /Partial public coverage|evidence gaps|not a live feed|single global growth rate/);
  } finally { dom.window.close(); }
});

test('PlateHero keeps explicit status badges on other pages', () => {
  for (const [status, label] of [['partial', 'Partial public coverage'], ['live', 'Live'], ['planned', 'Coming soon']]) {
    const html = renderToStaticMarkup(React.createElement(PlateHero, { kicker: 'Test', title: 'Test', description: 'Test', stats: [], status }));
    assert.ok(html.includes(label));
  }
});
