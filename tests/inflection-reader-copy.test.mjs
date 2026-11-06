import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ExpectationsSection } from '../src/components/sections/expectations-section.tsx';

globalThis.React = React;

function renderedInflections() {
  return new JSDOM(renderToStaticMarkup(React.createElement(ExpectationsSection)));
}

test('inflection copy positively distinguishes signals, supporting measurements, and external forecast proxies', () => {
  const dom = renderedInflections();
  try {
    const doc = dom.window.document;
    const intro = doc.querySelector('section > p').textContent.replace(/\s+/g, ' ').trim();
    assert.equal(intro, 'Inflection signals describe observable milestones; related measurements track supporting capabilities and adoption.');

    const expectedScopes = new Map([
      ['metric-implanted-bci-humans', 'Selected chronic intracortical research recipients.'],
      ['metric-recording-hours', 'Human scalp EEG and intracranial recordings, plus nonhuman-primate training data; datasets shown separately.'],
      ['metric-panel-neuroai-imagenet', 'ImageNet accuracy versus estimated inference energy.'],
      ['metric-paired-structure-function', 'Anatomy and activity matched in the same mouse specimen.'],
      ['metric-panel-flyvis-contrast', 'Fly visual-system contrast preference.'],
    ]);
    for (const [anchor, scope] of expectedScopes) {
      const item = doc.querySelector(`[data-related-measurement="${anchor}"]`).closest('li');
      assert.equal(item.querySelector('p:last-child').textContent, scope, anchor);
    }

    const expectedForecastScopes = new Map([
      ['The BCI app store', 'External proxy forecasts cover Neuralink implant counts and valuation.'],
      ['Neural distillation', 'External proxy forecast: brain emulation as a route to human-level AI.'],
      ['Memory retrieval in simulation', 'External proxy forecast: timing of human whole-brain emulation.'],
    ]);
    for (const [title, scope] of expectedForecastScopes) {
      const item = [...doc.querySelectorAll('[data-inflection]')].find(node => node.dataset.inflection === title);
      assert.equal(item.querySelector('[data-related-forecasts] p').textContent, scope, title);
    }

    // Forecast questions are verbatim source quotations, outside the editorial pass.
    const prose = doc.querySelector('section').cloneNode(true);
    prose.querySelectorAll('[data-related-forecasts] a').forEach(link => link.remove());
    assert.doesNotMatch(prose.textContent, /\b(?:we|our|ours|not|isn't|aren't|rather than|instead of)\b/i);
    assert.doesNotMatch(prose.textContent, /freshness|staleness|white space|coming soon|completion of/i);
  } finally { dom.window.close(); }
});

test('concise rendered signals retain every compound condition and quantitative bound', () => {
  const expectedSignals = new Map([
    ['The BCI app store', 'A regulator clears a standardized commercial BCI software/API layer with medical guardrails, and the first third-party app launches and is adopted.'],
    ['Neural distillation', 'A major lab matches frontier reasoning by training on human neural data at a fraction of the parameters/energy, or venture funding surges into consumer EEG to collect cognitive data for AI.'],
    ['The neuromorphic energy pivot', 'A brain-inspired model matches state-of-the-art performance at ≥1,000× the energy efficiency, and frontier labs begin acquiring neuromorphic startups.'],
    ['Memory retrieval in simulation', 'A simulation of a reconstructed mouse connectome reproduces a specific behavior learned by that mouse before its connectome was harvested.'],
  ]);
  const sourcePoints = JSON.parse(readFileSync('src/data/velocity/neurotech_inflection_points.json', 'utf8')).points;
  const dom = renderedInflections();
  try {
    const entries = [...dom.window.document.querySelectorAll('[data-inflection]')];
    assert.deepEqual(entries.map(node => node.dataset.inflection), sourcePoints.map(point => point.title));
    assert.deepEqual([...expectedSignals.keys()], sourcePoints.map(point => point.title), 'Review every source signal');
    for (const entry of entries) {
      const title = entry.dataset.inflection;
      assert.equal(entry.querySelector('h3').textContent, title, 'Preserve source titles and article identities');
      assert.equal(entry.querySelector('[data-inflection-signal]').textContent, expectedSignals.get(title), title);
    }
  } finally { dom.window.close(); }
});

test('forecast quotations, destinations, disclosure state, and measurement identities remain intact', () => {
  const markets = JSON.parse(readFileSync('src/data/velocity/neurotech_market_signals.json', 'utf8')).mappings;
  const platforms = { kalshi: 'Kalshi', polymarket: 'Polymarket', metaculus: 'Metaculus' };
  const expectedMeasurements = new Map([
    ['The BCI app store', [['metric-implanted-bci-humans', 'Implanted BCI recipients', 'Adoption proxy']]],
    ['Neural distillation', [['metric-recording-hours', 'Neural recording hours', 'Data supply']]],
    ['The neuromorphic energy pivot', [['metric-panel-neuroai-imagenet', 'NeuroAI performance–energy', 'Performance–energy']]],
    ['Memory retrieval in simulation', [
      ['metric-paired-structure-function', 'Paired structure–function datasets', 'Enabling capability'],
      ['metric-panel-flyvis-contrast', 'Simulation fidelity', 'Functional validation'],
    ]],
  ]);
  const dom = renderedInflections();
  try {
    const doc = dom.window.document;
    for (const [title, measurements] of expectedMeasurements) {
      const item = [...doc.querySelectorAll('[data-inflection]')].find(node => node.dataset.inflection === title);
      const actualMeasurements = [...item.querySelectorAll('[data-related-measurement]')];
      assert.deepEqual(actualMeasurements.map(link => [
        link.dataset.relatedMeasurement,
        link.textContent.replace(/\s*→$/, '').trim(),
        link.closest('li').querySelector('[data-measurement-relationship]').textContent,
      ]), measurements, title);
      assert.deepEqual(actualMeasurements.map(link => link.getAttribute('href')), measurements.map(([anchor]) => `#${anchor}`));

      const market = markets.find(mapping => mapping.title === title);
      const forecasts = item.querySelector('[data-related-forecasts]');
      if (market.match !== 'proxy') {
        assert.equal(forecasts, null, `${title}: retain source forecast selection`);
        continue;
      }
      assert.equal(forecasts.open, false, 'Retain collapsed disclosures');
      assert.equal(forecasts.querySelector('summary').textContent, 'Related forecasts');
      const expected = [market.primary, ...(market.fallback ? [market.fallback] : [])];
      assert.deepEqual([...forecasts.querySelectorAll('a')].map(link => ({
        text: link.textContent,
        href: link.getAttribute('href'),
        target: link.target,
        rel: link.rel,
      })), expected.map(forecast => ({
        text: `${platforms[forecast.platform]}: “${forecast.question}” ↗`,
        href: forecast.url,
        target: '_blank',
        rel: 'noreferrer',
      })), `${title}: preserve complete verbatim quotation, platform, and destination`);
    }
    assert.equal(doc.querySelectorAll('[role="progressbar"]').length, 0, 'Supporting evidence stays separate from milestone completion');
  } finally { dom.window.close(); }
});
