import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import MilestonesPageModule from '../src/app/milestones/page.tsx';
import { PlateHero } from '../src/components/plate-header.tsx';

const MilestonesPage = MilestonesPageModule.default ?? MilestonesPageModule;

globalThis.React = React;

test('Milestones omits the reported Live pill and its separator while preserving header context', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestonesPage)));
  try {
    const hero = dom.window.document.querySelector('section');
    assert.equal(hero.querySelector('h1').textContent, 'Milestones');
    const metadata = [...hero.firstElementChild.children].filter(el => el.tagName === 'SPAN');
    assert.deepEqual(metadata.map(el => el.textContent), ['Field events', '3 years']);
    assert.match(hero.textContent, /tracked events/);
    assert.match(hero.textContent, /companies on the axis/);
    assert.ok(dom.window.document.querySelector('[aria-label="Fold side panel to show the full year"]'));
  } finally {
    dom.window.close();
  }
});

test('shared PlateHero status remains available to other pages', () => {
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(PlateHero, {
    kicker: 'Example', title: 'Other page', description: 'Unchanged shared behavior', status: 'live', stats: [],
  })));
  try {
    const metadata = [...dom.window.document.querySelector('section').firstElementChild.children]
      .filter(el => el.tagName === 'SPAN');
    assert.deepEqual(metadata.map(el => el.textContent), ['Example', '•', 'Live']);
  } finally {
    dom.window.close();
  }
});
