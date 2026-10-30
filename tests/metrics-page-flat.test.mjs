import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FieldVelocityPage from '../src/app/field-velocity/page.tsx';

const Page = FieldVelocityPage.default ?? FieldVelocityPage;
function collect(node, names, found = []) {
  if (!React.isValidElement(node)) return found;
  if (names.has(node.type.name)) found.push(node);
  for (const key of ['children', 'engagementPreview', 'performance']) {
    React.Children.forEach(node.props[key], child => collect(child, names, found));
  }
  for (const child of Object.values(node.props.references ?? {})) collect(child, names, found);
  return found;
}

test('the actual Metrics page requests peer-card output from every supplemental chart family', () => {
  const cards = collect(Page(), new Set(['GoogleTrends', 'PaceReadings', 'PerformanceCurves']));
  assert.equal(cards.length, 4);
  for (const card of cards) assert.equal(card.props.flat, true, `${card.type.name}: flat output must be enabled by the real route`);
});
