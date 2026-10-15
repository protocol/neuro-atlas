import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const canonical = readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8');

function one(sourceUrl) {
  const rows = milestones.filter(row => row.sourceUrl === sourceUrl);
  assert.equal(rows.length, 1, `Expected one milestone for ${sourceUrl}`);
  assert.ok(canonical.includes(sourceUrl));
  return rows[0];
}

const paradromicsSources = [
  'https://paradromics.com/news/paradromics-completes-first-human-brain-computer-interface-bci-implantation/',
  'https://paradromics.com/news/paradromics-demonstrates-four-years-of-stable-neural-recording-in-major-brain-computer-interface-durability-milestone/',
];

test('Paradromics separates the first Connect-One implant from the APEX partnership and animal durability', () => {
  const [implant, durability] = paradromicsSources.map(one);
  assert.equal(implant.date, '2026-06-17');
  assert.equal(implant.activity, 'trial');
  assert.match(implant.note, /announcement date/i);
  assert.match(implant.note, /2025.*temporary/);
  assert.match(implant.note, /investigational/i);
  assert.equal(durability.date, '2026-10-08');
  assert.equal(durability.activity, 'preclinical');
  assert.match(durability.note, /two sheep/);
  assert.match(durability.note, /cortical modules/);
  assert.match(durability.note, /not.*human/i);
  for (const row of [implant, durability]) {
    assert.equal(row.stage, 'clinical');
    assert.equal(row.amountUsdM, null);
  }
  const apex = one('https://paradromics.com/news/paradromics-launches-apex-partnership-program-to-boost-neurotechnology-discovery/');
  assert.equal(apex.activity, 'partner');
  assert.doesNotMatch(apex.note, /first Connexus human implant followed on June 17/);
});

const precisionSources = [
  'https://www.globenewswire.com/news-release/2026/10/08/3377330/0/en/precision-neuroscience-unveils-a-new-map-of-the-human-nervous-system.html',
  'https://www.globenewswire.com/news-release/2026/04/30/3284938/0/en/precision-neuroscience-partners-with-uchicago-medicine-researchers-to-advance-brain-computer-interface-research.html',
];

test('Precision distinguishes its 70-patient research cohort from cumulative implants and partnership plans', () => {
  const [atlas, partnership] = precisionSources.map(one);
  assert.equal(atlas.date, '2026-10-08');
  assert.equal(atlas.activity, 'research');
  assert.equal(atlas.stage, 'clinical');
  assert.match(atlas.note, /70 patients across 12/);
  assert.match(atlas.note, /more than 180 hours/);
  assert.match(atlas.note, /Separately.*surpassed 100/);
  assert.match(atlas.note, /preprint/i);
  assert.match(atlas.note, /not.*permanent/);
  assert.equal(partnership.date, '2026-04-30');
  assert.equal(partnership.activity, 'partner');
  assert.match(partnership.note, /not.*clinical efficacy/);
  for (const row of [atlas, partnership]) assert.equal(row.amountUsdM, null);
  assert.equal(milestones.filter(row => row.slug === 'precision-neuroscience' && row.date === '2026-09-24' && row.stage === 'capital').length, 1);
  assert.equal(milestones.some(row => row.slug === 'precision-neuroscience' && row.date === '2026-10-15'), false);
});

const scienceSources = [
  'https://science.xyz/news/hud-designation/',
  'https://science.xyz/news/long-term-prima-results/',
  'https://science.xyz/news/stargardt-first-rehab/',
];

test('Science blog review adds qualified clinical disclosures, not marketing approvals or funding', () => {
  const [hud, followup, stargardt] = scienceSources.map(one);
  assert.deepEqual([hud.date, followup.date, stargardt.date], ['2026-07-22', '2026-10-05', '2026-10-13']);
  for (const row of [hud, followup, stargardt]) {
    assert.equal(row.slug, 'science-corp');
    assert.equal(row.stage, 'clinical');
    assert.equal(row.scope, 'bci');
    assert.equal(row.amountUsdM, null);
    assert.equal(row.datePrecision, 'day');
    assert.match(row.note, /announcement|disclosure/i);
  }
  assert.equal(hud.activity, 'HUD');
  assert.match(hud.note, /two FDA Humanitarian Use Device/);
  assert.match(hud.note, /not FDA marketing approval/);
  assert.match(followup.note, /18.*efficacy/);
  assert.match(followup.note, /27.*safety/);
  assert.match(followup.note, /14 of 18/);
  assert.match(followup.note, /29.*ETDRS/);
  assert.match(stargardt.note, /May 2026/);
  assert.match(stargardt.note, /single-patient/);
  assert.match(stargardt.note, /not.*trial-wide efficacy/i);
  const glossary = JSON.parse(readFileSync(new URL('../src/data/acronyms.json', import.meta.url)));
  assert.equal(glossary.HUD.expansion, 'Humanitarian Use Device');
  assert.match(glossary.HUD.definition, /not marketing approval/);
});

const studySource = 'https://pure.johnshopkins.edu/en/publications/initial-experience-with-the-precision-neuroscience-layer-7-micro-/';

test('Precision source corrections distinguish acute feasibility, co-development and temporary array clearance', () => {
  const study = one(studySource);
  assert.equal(study.date, '2026-02-01');
  assert.equal(study.activity, 'study');
  assert.match(study.note, /four patients/i);
  assert.match(study.note, /publication date/);
  assert.match(study.note, /not.*chronic/i);
  const medtronic = milestones.find(row => row.slug === 'precision-neuroscience' && row.date === '2026-01-12');
  assert.equal(medtronic.activity, 'partner');
  assert.match(medtronic.note, /co-develop/);
  const clearance = milestones.find(row => row.slug === 'precision-neuroscience' && row.date === '2025-04-17');
  assert.match(clearance.note, /March 30, 2025/);
  assert.match(clearance.note, /less than 30 days/);
  assert.match(clearance.note, /not.*chronic wireless BCI/);
});

test('All blog-review additions render once in the 2026 Milestone timeline with their direct source links', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const timeline = dom.window.document.querySelector('[aria-label="2026 timeline. Scroll horizontally for later months."]');
    assert.ok(timeline);
    for (const url of [...scienceSources, ...paradromicsSources, ...precisionSources, studySource]) {
      const row = one(url);
      const links = timeline.querySelectorAll(`a[href="${url}"]`);
      assert.equal(links.length, 1, url);
      assert.equal(links[0].getAttribute('aria-label'), `${row.company} — ${row.activity}`);
    }
  } finally {
    dom.window.close();
  }
});
