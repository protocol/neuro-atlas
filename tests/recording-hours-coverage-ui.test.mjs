import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { DraftChartsSection } from '../src/components/sections/draft-charts-section.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const pairs = [
  ['neuralink-reported-hours-2026-10-01', '>50,000 h · participants not disclosed'],
  ['tusz-scalp-eeg-2017-04-17', '170 h · 114 patients · 510 sessions'],
  ['tusz-scalp-eeg-2017-08-04', '425 h · 246 patients · 686 sessions'],
  ['tusz-scalp-eeg-2018-04-15', '504 h · 315 patients · 822 sessions'],
  ['tusz-scalp-eeg-2018-08-16', '651 h · 364 patients · 970 sessions'],
  ['tusz-scalp-eeg-2018-11-14', '651 h · 364 patients · 969 sessions'],
  ['tusz-scalp-eeg-2019-07-22', '1,074 h · 692 patients · 1,661 sessions'],
  ['tusz-scalp-eeg-2020-04-23', '1,074 h · 692 patients · 1,575 sessions'],
  ['tusz-scalp-eeg-2020-05-09', '1,074 h · 692 patients · 2,608 sessions'],
  ['ajile12-intracranial-2022-01-27', '1,280 h · 12 participants'],
  ['poyo-primate-training-2023-10-24', '>100 h · 7 nonhuman primates · >158 sessions'],
  ['japaneeg-scalp-eeg-2026-05-31', '1,020 h · 3 participants'],
];

test('the current shared chart exposes matched coverage at rest, on selected points, in the source table and accessible marks, without growing previews', async () => {
  const cleanup = await mount(React.createElement(DraftChartsSection));
  try {
    const card = document.getElementById('draft-recording-hours');
    const preview = card.querySelector('[data-draft-preview]');
    const previewFrame = preview.querySelector('svg').getAttribute('viewBox');
    assert.equal(preview.querySelector('[data-recording-coverage-list]'), null);
    await click(card.querySelector('[data-draft-popout-trigger]'));
    const dialog = document.querySelector('dialog[open]');
    assert.equal(dialog.querySelectorAll('svg.draft-plot-svg').length, 1);
    const comparison = dialog.querySelector('[data-recording-coverage-list]');
    assert.ok(comparison, 'Paired coverage is discoverable at rest in the chart detail, not hidden in Data');
    assert.equal(comparison.closest('details'), null);
    assert.match(comparison.textContent, /linear bars.*largest displayed/i);
    assert.match(comparison.textContent, /50,000 h \(lower bound\)/);
    assert.match(comparison.textContent, /692 individuals/);
    assert.match(comparison.textContent, /not recording quality/i);
    const averages = [
      '— h/participant (count undisclosed) · — h/session (count not reported)',
      '≈1.491 h/patient · ≈0.3333 h/session',
      '≈1.728 h/patient · ≈0.6195 h/session',
      '≈1.6 h/patient · ≈0.6131 h/session',
      '≈1.788 h/patient · ≈0.6711 h/session',
      '≈1.788 h/patient · ≈0.6718 h/session',
      '≈1.552 h/patient · ≈0.6466 h/session',
      '≈1.552 h/patient · ≈0.6819 h/session',
      '≈1.552 h/patient · ≈0.4118 h/session',
      '≈106.7 h/participant · — h/session (count not reported)',
      '>14.2 h/animal · — h/session (both values are lower bounds)',
      '≈340 h/participant · — h/session (count not reported)',
    ];
    assert.equal(comparison.querySelectorAll('[data-recording-bar-fill]').length, 23);
    const bar = (id, metric) => comparison.querySelector(`[data-recording-coverage-row="${id}"] [data-recording-bar="${metric}"]`);
    const width = (id, metric) => Number.parseFloat(bar(id, metric).querySelector('[data-recording-bar-fill]').style.width);
    assert.ok(Math.abs(width(pairs[1][0], 'hours') - 100 * 170 / 50000) < 1e-9);
    assert.ok(Math.abs(width(pairs[8][0], 'contributors') - 100) < 1e-9);
    assert.ok(Math.abs(width(pairs[10][0], 'hours') - 100 * 100 / 50000) < 1e-9);
    assert.equal(bar(pairs[0][0], 'contributors').querySelectorAll('[data-recording-bar-fill]').length, 0);
    assert.deepEqual([...comparison.querySelectorAll('[data-recording-bar-lower-bound]')].map(fill => fill.closest('li').dataset.recordingCoverageRow), [pairs[0][0], pairs[10][0]]);
    assert.ok(dialog.querySelector('[data-draft-group-legend]').compareDocumentPosition(comparison) & window.Node.DOCUMENT_POSITION_FOLLOWING, 'The modality/access legend stays immediately above the coverage list');
    assert.ok([...dialog.querySelectorAll('thead th')].some(th => th.textContent === 'Recording hours / coverage'));
    assert.equal(comparison.querySelectorAll('[data-recording-coverage-row]').length, 12);
    const sourceRows = [...dialog.querySelectorAll('tbody tr')];
    for (const [index, [id, pair]] of pairs.entries()) {
      assert.ok(comparison.querySelector(`[data-recording-coverage-row="${id}"]`).textContent.includes(pair), `${id}: comparison`);
      const mark = dialog.querySelector(`[data-source-observation="${id}"]`);
      assert.ok(mark.getAttribute('aria-label').includes(pair), `${id}: accessible paired point text`);
      assert.ok(sourceRows[index].textContent.includes(pair), `${id}: source table`);
      await act(async () => mark.dispatchEvent(new Event('focusin', { bubbles: true })));
      const tooltip = dialog.querySelector('[role=tooltip]');
      assert.ok(tooltip.textContent.includes(pair), `${id}: selected readout`);
      for (const [surface, text] of [
        ['comparison', comparison.querySelector(`[data-recording-coverage-row="${id}"]`).textContent],
        ['accessible mark', mark.getAttribute('aria-label')],
        ['source table', sourceRows[index].textContent],
        ['readout', tooltip.textContent],
      ]) assert.ok(text.includes(`Calculated average: ${averages[index]}`), `${id}: calculated average in ${surface}`);
    }
    assert.match(dialog.querySelector('[role=tooltip]').textContent, /≈60–814 h per participant \(calculated from Table 4\)/);
    assert.match(dialog.querySelector('[role=tooltip]').textContent, /not a continuous session/);
    assert.doesNotMatch(dialog.textContent, /OpenNeuro|CC0|open release claim/);
    assert.ok(dialog.querySelector('a[href="https://arxiv.org/html/2606.01264v2"]'));
    assert.ok(dialog.querySelector('a[href="https://www.nature.com/articles/s41597-022-01280-y"]'));
    assert.equal(preview.querySelector('svg').getAttribute('viewBox'), previewFrame, 'Keep the uniform compact preview coordinate frame');
    assert.equal(document.querySelectorAll('[data-draft-preview] [data-recording-coverage-list]').length, 0);
    await click(comparison.querySelector(`[data-recording-coverage-row="${pairs[10][0]}"] button`));
    assert.match(dialog.querySelector('[data-point-tooltip][data-pinned]').textContent, /POYO-1.*>14\.2 h\/animal/s);
  } finally { await cleanup(); }
});
