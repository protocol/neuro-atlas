import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/lib/funding-index.mjs';

const loadCanonical = file => parseCsv(readFileSync(new URL(file, import.meta.url), 'utf8'));
const timeline = loadCanonical('../data/market-memo-q1-2026/milestones.csv');
const regulatory = loadCanonical('../data/funding-index/milestones.csv');
const one = (rows, sourceUrl) => {
  const matches = rows.filter(row => row.source_url === sourceUrl);
  assert.equal(matches.length, 1, `Expected one canonical row for ${sourceUrl}`);
  return matches[0];
};

test('Envoy capital counts closing proceeds, not contingent warrant proceeds', () => {
  const row = one(timeline, 'https://ir.envoymedical.com/news-events/press-releases/detail/80/envoy-medical-announces-closing-of-up-to-78-0-million-upsized-public-offering');
  assert.equal(row.company, 'Envoy Medical');
  assert.equal(row.date, '2026-02-12');
  assert.equal(row.amount_usd_m, '30');
  assert.equal(row.activity, '$30m');
  assert.match(row.note, /\$30m.*gross proceeds at closing/);
  assert.match(row.note, /up to \$48m.*contingent on cash exercise of milestone-linked warrants/);
  assert.match(row.note, /not included in the plotted amount/);
});

test('Synchron describes a planned pivotal trial at the article date in both canonical sources', () => {
  const source = 'https://www.techtimes.com/articles/317929/20260606/synchron-brain-implant-targets-2026-pivotal-trial-first-fda-approved-bci.htm';
  const row = one(timeline, source);
  const marker = one(regulatory, source);
  assert.equal(row.company, 'Synchron');
  assert.equal(marker.company_slug, 'synchron');
  assert.equal(row.activity, 'pivotal planned');
  assert.equal(marker.marker, 'Pivotal (planned)');
  assert.equal(row.date, '2026-06-06');
  assert.equal(marker.announced_on, '2026-06-06');
  for (const canonical of [row, marker]) {
    assert.match(canonical.note, /Preparing a pivotal clinical trial of Stentrode in 2026/);
    assert.match(canonical.note, /June 6 is the article date, not a trial-start date/);
    assert.doesNotMatch(canonical.note, /initiated|initiation|first|PMA|Series D|closed/i);
  }
});

test('Phantom records Australian authorization to begin CYBORG, not a completed implantation', () => {
  const row = one(timeline, 'https://insidebci.com/news/2026-04-15-phantom-neuro-gets-green-light-for-first-human-trial-of-its-subcutaneous-prosthetic-sensor/');
  assert.equal(row.company, 'Phantom Neuro');
  assert.equal(row.date, '2026-04-15');
  assert.equal(row.activity, 'FIH approved');
  assert.match(row.note, /Australian approval to begin the CYBORG first-in-human study of Phantom X/);
  assert.match(row.note, /subcutaneous sensor array \(Cabrini Health, Melbourne\)/);
  assert.match(row.note, /Study authorization, not a completed implantation/);
  assert.doesNotMatch(row.note, /FDA|EMG/);
});

test('MintNeuro and Motif partnership uses the April 30 announcement without the memo omission qualifier', () => {
  const row = one(timeline, 'https://www.prnewswire.com/news-releases/mintneuro-and-motif-neurotech-partner-to-advance-miniature-brain-computer-interface-therapy-for-mental-health-302758663.html');
  assert.equal(row.company, 'Motif Neurotech');
  assert.equal(row.activity, 'partner');
  assert.equal(row.date, '2026-04-30');
  assert.equal(row.date_precision, 'day');
  assert.equal(row.note, 'MintNeuro partnership to advance miniature BCI therapy for mental health');
  assert.doesNotMatch(row.note, /omitted|visual|window|completeness|memo/i);
});

test('Neuralink first human implantation is January 28, distinct from the January 29 announcement', () => {
  const row = one(timeline, 'https://fortune.com/2024/01/30/elon-musk-first-human-neuralink-implant-recovering-well');
  assert.equal(row.company, 'Neuralink');
  assert.equal(row.activity, 'FIH');
  assert.equal(row.date, '2024-01-28');
  assert.equal(row.date_precision, 'day');
  assert.match(row.note, /implant.*on January 28, 2024; announced January 29, 2024/);
});

test('INBRAIN TAP is January 2024 with month precision in both canonical sources', () => {
  const source = 'https://inbrain-neuroelectronics.com/';
  const row = one(timeline, source);
  const marker = one(regulatory, source);
  assert.equal(row.company, 'INBRAIN Neuroelectronics');
  assert.equal(marker.company_slug, 'inbrain-neuroelectronics');
  assert.equal(row.activity, 'TAP');
  assert.equal(marker.marker, 'TAP');
  // The first day is a storage anchor only; the source establishes no exact day.
  assert.equal(row.date, '2024-01-01');
  assert.equal(marker.announced_on, '2024-01-01');
  for (const canonical of [row, marker]) {
    assert.equal(canonical.date_precision, 'month');
    assert.equal(canonical.note, 'Accepted into FDA TAP in January 2024; exact day not disclosed.');
    assert.doesNotMatch(canonical.note, /digest|March|January 1\b|January 01\b/i);
  }
});
