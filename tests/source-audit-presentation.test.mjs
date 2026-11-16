import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';
import { mount, click } from './modal-helpers.mjs';

globalThis.React = React;
const rows = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const hover = async el => { assert.ok(el); await act(async () => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))); };

test('Milestones tooltip preserves month precision instead of inventing a first day', async () => {
  const row = rows.find(r => r.slug === 'inbrain-neuroelectronics' && r.activity === 'TAP');
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
    await hover(document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`));
    const tip = document.querySelector('[data-milestone-detail]') ?? [...document.querySelectorAll('div.fixed')].find(el => el.textContent.includes(row.note));
    assert.ok(tip, 'actual detail tooltip opens');
    const expected = new Date(row.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    assert.ok(tip.textContent.includes(expected), tip.textContent);
    assert.ok(!tip.textContent.includes(expected.replace(' 2024', ' 1, 2024')), 'placeholder day is not displayed');
  } finally { await cleanup(); }
});

test('Milestones commercial transaction values are explicitly separate from capital raised', async () => {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await click(document.querySelector('button[aria-label="Open side panel"]'));
    const aside = document.querySelector('aside');
    assert.match(aside.textContent, /transaction value.*not capital raised/i);
  } finally { await cleanup(); }
});


test('Milestones distinguishes a reported date from an underlying trial event date', async () => {
  const row = rows.find(r => r.slug === 'synchron' && r.sourceUrl.includes('techtimes.com'));
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await hover(document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`));
    const tip = document.querySelector('[data-milestone-detail]') ?? [...document.querySelectorAll('div.fixed')].find(el => el.textContent.includes(row.note));
    assert.match(tip.textContent, /Reported Jun 6, 2026/);
  } finally { await cleanup(); }
});


test('Milestones keeps philanthropic commitments out of cash-raised wording', async () => {
  const row = rows.find(r => r.slug === 'forest-neurotech');
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
    await hover(document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`));
    const tip = document.querySelector('[data-milestone-detail]');
    assert.match(tip.textContent, /committed/);
    assert.doesNotMatch(tip.textContent, /committed raised/);
    await click(document.querySelector('button[aria-label="Open side panel"]'));
    assert.match(document.querySelector('aside').textContent, /Indexed financing/);
    assert.match(document.querySelector('aside').textContent, /commitments/);
    assert.doesNotMatch(document.querySelector('aside').textContent, /rounds raised/);
  } finally { await cleanup(); }
});


test('approximate financing labels retain their source approximation marker', async () => {
  const row = rows.find(r => r.slug === 'echo-neurotech');
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await click(document.querySelector('button[aria-label^="Focus 2025:"]'));
    await hover(document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`));
    assert.match(document.querySelector('[data-milestone-detail]').textContent, /~\$50m financing/);
  } finally { await cleanup(); }
});

test('CONVOY uses a generic feasibility activity, not an unestablished formal EFS designation', async () => {
  const row = rows.find(r => r.note.includes('CONVOY'));
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try {
    await click(document.querySelector('button[aria-label^="Focus 2024:"]'));
    await hover(document.querySelector(`a[aria-label="${row.company} — ${row.activity}"]`));
    const tip = document.querySelector('[data-milestone-detail]');
    assert.match(tip.textContent, /feasibility/);
    assert.doesNotMatch(tip.textContent, /EFS|Early Feasibility Study/);
    assert.equal(row.activity, 'feasibility');
  } finally { await cleanup(); }
});

test('designation and advisory-program events belong to an explicitly clinical / regulatory lane', async () => {
  const cleanup = await mount(React.createElement(MilestoneTimeline));
  try { assert.match(document.body.textContent, /Clinical \/ regulatory/); }
  finally { await cleanup(); }
});
