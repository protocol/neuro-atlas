import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { MilestoneTimeline } from '../src/components/milestone-timeline.tsx';

const milestones = JSON.parse(readFileSync(new URL('../src/data/milestones.json', import.meta.url)));
const funding = JSON.parse(readFileSync(new URL('../src/data/funding-index.json', import.meta.url)));
const canonical = readFileSync(new URL('../data/market-memo-q1-2026/milestones.csv', import.meta.url), 'utf8');
const issue = readFileSync(new URL('../data/notables/notables-64.md', import.meta.url), 'utf8');

const sources = {
  newronika: 'https://newronika.com/news/newronika-announces-first-participant-implanted-in-advent-pivotal-study',
  neuralink: 'https://neuralink.com/updates/pretraining-on-50000-hours/',
  inbrain: 'https://www.businesswire.com/news/home/20261006841829/en/INBRAIN-Neuroelectronics-and-MINIGRAPH-European-Consortium-Develop-Magnetically-Guided-Robotic-Implantation-for-Ultra-Thin-Graphene-Brain-Computer-Interfaces',
  sciencePrima: 'https://science.xyz/news/long-term-prima-results/',
  paradromicsDurability: 'https://paradromics.com/news/paradromics-demonstrates-four-years-of-stable-neural-recording-in-major-brain-computer-interface-durability-milestone/',
  precisionAtlas: 'https://www.globenewswire.com/news-release/2026/10/08/3377330/0/en/precision-neuroscience-unveils-a-new-map-of-the-human-nervous-system.html',
  scienceLeadership: 'https://science.xyz/news/leadership-shahida/',
};

const additions = [sources.newronika, sources.neuralink, sources.inbrain];
const baseline = {
  canonicalRows: 81,
  canonicalSha256: '77d68a2db3bafc43faf4dced3517cce12a664623fcc3dcb54854660d470e8d0e',
  generatedRows: 81,
  generatedSha256: 'c5ad96105244bbba8aa6f27efab6b93ab6b5667910933f4eec39a5621ad36f43',
};

function one(sourceUrl) {
  const rows = milestones.filter(row => row.sourceUrl === sourceUrl);
  assert.equal(rows.length, 1, `Expected one milestone for ${sourceUrl}`);
  assert.ok(canonical.includes(sourceUrl));
  return rows[0];
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') { cell += '"'; index += 1; } else inQuotes = false;
      } else cell += character;
    } else if (character === '"') inQuotes = true;
    else if (character === ',') { row.push(cell); cell = ''; }
    else if (character === '\n') { row.push(cell); cell = ''; if (row.some(value => value !== '')) rows.push(row); row = []; }
    else if (character !== '\r') cell += character;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some(value => value !== '')) rows.push(row); }
  const [header, ...body] = rows;
  return body.map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function expectedDerivedRow(row) {
  return {
    company: row.company,
    slug: slugify(row.company),
    activity: row.activity,
    stage: row.stage,
    amountUsdM: row.amount_usd_m ? Number(row.amount_usd_m) : null,
    date: row.date || null,
    datePrecision: row.date_precision || 'window',
    note: row.note || null,
    sourceUrl: row.source_url || null,
    scope: row.scope || 'bci',
  };
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('Notables 64 is exactly the permitted three-row delta from the frozen pre-issue baseline', () => {
  const canonicalRows = parseCSV(canonical);
  const canonicalAdditions = canonicalRows.filter(row => additions.includes(row.source_url));
  const generatedAdditions = milestones.filter(row => additions.includes(row.sourceUrl));
  const canonicalBaseline = canonicalRows.filter(row => !additions.includes(row.source_url));
  const generatedBaseline = milestones.filter(row => !additions.includes(row.sourceUrl));

  assert.equal(canonicalRows.length, baseline.canonicalRows + additions.length);
  assert.equal(milestones.length, baseline.generatedRows + additions.length);
  assert.deepEqual(canonicalAdditions.map(row => row.source_url).sort(), [...additions].sort());
  assert.deepEqual(generatedAdditions.map(row => row.sourceUrl).sort(), [...additions].sort());
  assert.equal(sha256(canonicalBaseline), baseline.canonicalSha256);
  assert.equal(sha256(generatedBaseline), baseline.generatedSha256);
  const sourceIssue = issue.match(/^\[1\] (.+)$/m);
  assert.ok(sourceIssue, 'issue provenance must retain source [1]');
  assert.equal(sourceIssue[1], 'https://neurotechnology.substack.com/p/notables-64');
});

test('Notables 64 adds exactly three qualified milestones without funding or regulatory inflation', () => {
  assert.deepEqual(new Set(additions).size, 3);

  const newronika = one(sources.newronika);
  assert.equal(newronika.company, 'Newronika');
  assert.equal(newronika.date, '2026-09-21');
  assert.equal(newronika.activity, 'pivotal');
  assert.equal(newronika.stage, 'clinical');
  assert.equal(newronika.scope, 'broader');
  assert.match(newronika.note, /first ADVENT participant/i);
  assert.match(newronika.note, /September 30 announcement/i);
  assert.match(newronika.note, /not.*approval|not.*results/i);

  const neuralink = one(sources.neuralink);
  assert.equal(neuralink.company, 'Neuralink');
  assert.equal(neuralink.date, '2026-10-01');
  assert.equal(neuralink.activity, 'research');
  assert.equal(neuralink.stage, 'clinical');
  assert.equal(neuralink.scope, 'bci');
  assert.match(neuralink.note, /participants streamed over 50,000 hours/i);
  assert.match(neuralink.note, /participant-specific neural encoders were pretrained on thousands of hours/i);
  assert.doesNotMatch(neuralink.note, /pretraining on more than 50,000 hours/i);
  assert.match(neuralink.note, /11\.32 BPS/);
  assert.match(neuralink.note, /company-reported/i);
  assert.match(neuralink.note, /not.*independent|not.*approval/i);

  const inbrain = one(sources.inbrain);
  assert.equal(inbrain.company, 'INBRAIN Neuroelectronics');
  assert.equal(inbrain.date, '2026-10-07');
  assert.equal(inbrain.activity, 'preclinical');
  assert.equal(inbrain.stage, 'clinical');
  assert.equal(inbrain.scope, 'bci');
  assert.match(inbrain.note, /MINIGRAPH/i);
  assert.match(inbrain.note, /translational model/i);
  assert.match(inbrain.note, /not.*human implantation|not.*regulatory/i);

  for (const row of [newronika, neuralink, inbrain]) {
    assert.equal(row.amountUsdM, null);
    assert.equal(row.datePrecision, 'day');
    assert.equal(funding.rounds.some(round => round.announcedOn === row.date && round.companySlug === row.slug), false);
  }
  assert.equal(funding.milestones.some(row => additions.includes(row.sourceUrl)), false);
});

test('Notables 64 is semantically deduplicated and keeps excluded candidates out of this update', () => {
  assert.equal(milestones.filter(row => row.sourceUrl === sources.sciencePrima).length, 1);
  assert.equal(milestones.filter(row => row.sourceUrl === sources.paradromicsDurability).length, 1);
  assert.equal(milestones.filter(row => row.sourceUrl === sources.precisionAtlas).length, 1);
  assert.equal(milestones.filter(row => row.sourceUrl === sources.scienceLeadership).length, 1, 'legacy leadership row is unchanged, not re-added');
  assert.equal(milestones.filter(row => row.company === 'Science Corp' && /PRIMAvera 36-month/i.test(row.note)).length, 1);
  assert.equal(milestones.filter(row => row.company === 'Paradromics' && /four-year preclinical durability/i.test(row.note)).length, 1);
  assert.equal(milestones.filter(row => row.company === 'Precision Neuroscience' && /70 patients across 12 academic centers/i.test(row.note)).length, 1);
  assert.equal(milestones.some(row => /attune|neuraxis/i.test(row.company)), false);

  assert.match(issue, /## Added to the Milestone timeline/);
  for (const source of additions) assert.match(issue, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(issue, /Science Corporation — PRIMA 36-month results:.*already represented/s);
  assert.match(issue, /Paradromics — four-year recording durability:.*already represented/s);
  assert.match(issue, /Precision Neuroscience — nervous-system atlas:.*already represented/s);
  assert.match(issue, /existing legacy leadership row is not modified or re-counted/i);
  assert.match(issue, /routine leadership appointments are not a Notables #64 timeline addition/i);
  assert.match(issue, /Attune's VANTUS study, NeurAxis coverage.*no companies were added/s);
});

test('Notables 64 generated milestones preserve exact canonical CSV values', () => {
  const canonicalRows = parseCSV(canonical);
  for (const sourceUrl of additions) {
    const canonicalRow = canonicalRows.filter(row => row.source_url === sourceUrl);
    assert.equal(canonicalRow.length, 1, `Expected exactly one canonical CSV row for ${sourceUrl}`);
    const actual = one(sourceUrl);
    const fields = ['company', 'slug', 'activity', 'stage', 'amountUsdM', 'date', 'datePrecision', 'note', 'sourceUrl', 'scope'];
    assert.deepEqual(Object.fromEntries(fields.map(field => [field, actual[field]])), expectedDerivedRow(canonicalRow[0]));
  }
});

test('Notables 64 additions each render once on the 2026 Milestone timeline with their direct source link', () => {
  globalThis.React = React;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(MilestoneTimeline)));
  try {
    const timeline = dom.window.document.querySelector('[aria-label="2026 timeline. Scroll horizontally for later months."]');
    assert.ok(timeline);
    for (const url of additions) {
      const row = one(url);
      const links = timeline.querySelectorAll(`a[href="${url}"]`);
      assert.equal(links.length, 1, url);
      assert.equal(links[0].getAttribute('aria-label'), `${row.company} — ${row.activity}`);
    }
  } finally {
    dom.window.close();
  }
});
