import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
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
    { value: String(evidence.filter(item => item.timeline).length), label: 'event timeline' },
    { value: String(evidence.filter(item => item.status !== 'plotted').length), label: 'evidence gaps' },
  ]);
});
