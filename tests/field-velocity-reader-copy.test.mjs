import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { PaceReadings } from '../src/components/pace-readings.tsx';
import { selectPace } from '../src/lib/field-velocity/performance.ts';
import { projectCitationRecord } from '../src/lib/field-velocity/citation-latency-feed.ts';
import { bundledCitationView } from '../src/lib/field-velocity/citation-latency-view.ts';
import { GoogleTrends } from '../src/components/google-trends.tsx';
import { mount } from './modal-helpers.mjs';
globalThis.React = React;
const feed = JSON.parse(readFileSync('src/data/field-velocity/neurotech.snapshot.json', 'utf8'));

test('citation description states reference age, preserves plotted data and omits unrelated patent/policy copy', async () => {
  const source = feed.records.find(r => r.instrument === 'idea_vintage');
  const projected = projectCitationRecord(bundledCitationView.data, source);
  const cleanup = await mount(React.createElement(PaceReadings, { data: selectPace(feed), flat: true }), '#idea_vintage');
  try {
    const modal = document.querySelector('dialog[open]');
    const methodology = modal.querySelector('.pc-methodology');
    assert.match(methodology.textContent, /A falling median means papers cite more recent work; a rising median means they cite older work\./);
    assert.match(methodology.textContent, /when the citing paper was published/);
    assert.match(methodology.textContent, /two-segment fit.*statistically clear/);
    assert.match(methodology.textContent, /older foundational citations from adjacent fields/);
    assert.match(methodology.textContent, /indexing lag.*about two years old/);
    assert.doesNotMatch(modal.textContent, /\b(?:we|our)\b|Patent vintage|freshness rules|staleness flag|Reference age is not research quality|fresher ideas|accelerat|decelerat/i);
    assert.equal(modal.querySelectorAll('[data-curve-point]').length, projected.series.length);
    assert.deepEqual([...modal.querySelectorAll('[data-source-observation]')].map(row => Number(row.cells[0].textContent)), projected.series.map(p => p.x));
    assert.deepEqual([...modal.querySelectorAll('[data-source-observation]')].map(row => Number.parseFloat(row.cells[1].textContent)), projected.series.map(p => p.y));
    for (const source of projected.sources) assert.ok([...modal.querySelectorAll('.pc-sources a')].some(a => a.getAttribute('href') === source.url), `source link ${source.url}`);
  } finally { await cleanup(); }
});

test('search-interest methodology states scope and normalization without internal policy or negative definitions', async () => {
  const cleanup = await mount(React.createElement(GoogleTrends, { selection: ['neurotech'], flat: true }), '#google-trends-neurotech');
  try {
    const modal = document.querySelector('dialog[open]');
    const method = modal.querySelector('[aria-label="Google Trends methodology"]').textContent;
    for (const phrase of [/English search terms/, /shared 0–100 scale/, /broad term matching/, /sample of searches/, /100 marks.*peak/, /0 indicates low or insufficient interest/, /missing data.*gaps/, /complete weeks/, /partial periods/, /UTC/, /original index/]) assert.match(method, phrase);
    assert.doesNotMatch(method, /\b(?:we|our|not|never)\b|Neuralink|refresh instructions|pinned to|source revision/i);
    assert.doesNotMatch(modal.querySelector('.gt-hash').textContent, /docs\/|refresh instructions/);
    assert.ok(modal.querySelectorAll('[data-trends-row]').length > 150);
    assert.equal(modal.querySelectorAll('.pc-sources a[download]').length, 2);
  } finally { await cleanup(); }
});

test('recording notes describe each measurement positively and retain the scientific distinctions', async () => {
  const { RECORDING_VIEWS: views } = await import('../src/data/recording-evidence.ts');
  for (const view of views) {
    assert.doesNotMatch([view.description, view.caveat, ...view.points.map(p => p.note)].join(' '), /\b(?:we|our|not|never|no)\b/i);
  }
  assert.match(views[0].description + views[0].caveat, /sorting|curation/);
  assert.match(views[1].caveat, /hardware.*active.*isolated.neuron/i);
  assert.match(views[2].description, /1,136,223.*2\.2/);
  assert.match(views[2].caveat, /calcium|sampling/);
});

test('participant source notes keep original quotations and cohort qualifications in concise descriptions', async () => {
  const { ParticipantCommitments } = await import('../src/components/participant-commitments.tsx');
  const cleanup = await mount(React.createElement(ParticipantCommitments), '#revealed_commitments');
  try {
    const modal = document.querySelector('dialog[open]');
    const method = modal.querySelector('.pc-methodology').textContent;
    assert.doesNotMatch(method, /\b(?:we|our|not|never|no)\b|rather than/i);
    assert.match(method, /cohorts overlap/i);
    assert.match(method, /lower bounds/i);
    const notes = [...modal.querySelectorAll('tbody tr td:last-child > p')].map(p => p.textContent);
    for (const note of notes) assert.doesNotMatch(note.replace(/“[^”]*”/g, ''), /\b(?:we|our|not|never|no)\b|Do not|rather than/i);
    assert.match(notes.join(' '), /31.*active/);
    assert.match(notes.join(' '), /22.*ARC-IM/);
    assert.match(notes.join(' '), /32.*overlap|overlap.*32/);
    assert.equal(modal.querySelectorAll('[data-source-observation]').length, 15);
  } finally { await cleanup(); }
});

test('translation intervals keep report-date and endpoint scope while removing internal history and instructions', async () => {
  const { LatencyEvidenceCard } = await import('../src/components/latency-evidence-card.tsx');
  const cleanup = await mount(React.createElement(LatencyEvidenceCard), '#latency_compression');
  try {
    const modal = document.querySelector('dialog[open]');
    const prose = [...modal.querySelectorAll('.pc-methodology p, tbody p, tbody small')].map(p => p.textContent).join(' ');
    assert.doesNotMatch(prose, /\b(?:we|our|not|never|no)\b|Do not|upstream|withdraw|pooled median|silently promote/i);
    assert.match(prose, /selected public preclinical report/i);
    assert.match(prose, /temporary.*placement/i);
    assert.match(prose, /April 18.*April 8.*unresolved/i);
    assert.match(prose, /month precision/i);
    assert.match(prose, /human.*unverified|unverified.*human/i);
    assert.equal(modal.querySelectorAll('[data-latency-pair]').length, 5);
    assert.equal(modal.querySelectorAll('[data-latency-pathway]').length, 3);
    assert.equal(modal.querySelectorAll('[data-source-stage]').length, 10);
  } finally { await cleanup(); }
});
