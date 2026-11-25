import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { parseCsv } from '../scripts/lib/funding-index.mjs';
import { scanSources } from './helpers/methodology-source-inventory.mjs';
import { createHash } from 'node:crypto';
import { HISTORICAL_RECORDING_ROWS, HISTORICAL_RECORDING } from '../src/data/historical-recording.ts';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const csv = path => parseCsv(readFileSync(path, 'utf8'));
const scienceIndex = 'https://www.sec.gov/Archives/edgar/data/1873836/000187383625000001/0001873836-25-000001-index.htm';
const scienceFiling = 'https://www.sec.gov/Archives/edgar/data/1873836/000187383625000001/xslFormDX01/primary_doc.xml';
const scienceNews = 'https://news.crunchbase.com/venture/braintech-ai-startup-science-neuralink-alums-seriesc/';

test('Science April 2025 cites its real filing and separately sources the supported investor', () => {
  const rounds = csv('data/funding-index/rounds.csv').filter(row => row.company_slug === 'science-corporation' && row.announced_on === '2025-04-14' && row.stage === 'Convertible notes');
  const milestones = csv('data/market-memo-q1-2026/milestones.csv').filter(row => row.company === 'Science Corp' && row.date === '2025-04-14' && row.stage === 'capital');
  assert.equal(rounds.length, 1, 'exact Science notes identity, not a neighboring financing');
  assert.equal(milestones.length, 1, 'exact Science capital disclosure');
  const [round] = rounds, [milestone] = milestones;
  assert.equal(round.source_url, scienceFiling, 'Funding cites the actual amount-and-instrument filing body');
  assert.equal(milestone.source_url, scienceIndex);
  assert.equal(round.amount_usd_m, '103.604355', 'exact sold proceeds, not the rounded $104m report or $110m target');
  assert.equal(milestone.amount_usd_m, '103.604355');
  assert.equal(round.display_amount, '$103.604355m');
  assert.equal(round.investors, 'Khosla Ventures');
  for (const row of [round, milestone]) {
    assert.equal(row.date_basis, 'reported');
    assert.equal(row.capital_treatment, 'overlap-unresolved', 'the actual note amount remains disclosed but is not additive capital');
    assert.match(row.note, /first sale (?:was )?March 28/i);
  }
  assert.match(round.note, /April 14, 2025 SEC Form D reports \$103,604,355 in convertible notes sold toward a \$110m target/);
  assert.match(milestone.note, /April 14 is the SEC filing date, not an established closing date/);
  const evidence = json('data/funding-index/investor-evidence.json').filter(row => row.companySlug === 'science-corporation' && row.announcedOn === '2025-04-14' && row.stage === 'Convertible notes' && row.sourceUrl === scienceNews);
  assert.equal(evidence.length, 1, 'the separate Crunchbase investor evidence remains attached to the exact note financing');
  assert.equal(evidence[0].investorName, 'Khosla Ventures');
  assert.match(evidence[0].sourceExcerpt, /convertible note led by Khosla last April/);
  const shipped = json('src/data/funding-index.json').rounds.filter(row => row.companySlug === 'science-corporation' && row.announcedOn === '2025-04-14' && row.stage === 'Convertible notes');
  assert.equal(shipped.length, 1);
  const [built] = shipped;
  assert.deepEqual(built.investors, ['Khosla Ventures']);
  assert.equal(built.sourceUrl, scienceFiling);
  assert.equal(built.amountUsdM, 103.604355);
  assert.equal(built.capitalTreatment, 'overlap-unresolved');
  const builtEvidence = built.investorEvidence.filter(row => row.sourceUrl === scienceNews);
  assert.equal(builtEvidence.length, 1);
  assert.equal(builtEvidence[0].investorName, 'Khosla Ventures');
});

test('OpenAlex fixture group identifiers are not published as citations and fixture bytes stay unchanged', () => {
  const { included, excluded } = scanSources();
  assert.equal(createHash('sha256').update(readFileSync('docs/publications/matched-baselines-fixtures.json')).digest('hex'), '294153517d645c65a5659d0a8bccfdb2164ad18689308bd0c55b0e3a34d2d363');
  const identifiers = [...excluded.keys()].filter(url => /^https:\/\/openalex.org\/(?:source-types|types)\//.test(url));
  assert.equal(identifiers.length, 13);
  for (const url of identifiers) {
    assert.equal(included.has(url), false);
    assert.ok(excluded.get(url).every(row => /group identifier/.test(row.reason)));
  }
});


test('IOP error-page citations use verified same-DOI abstracts without rewriting frozen tracker rows', () => {
  for (const [doi, alternate] of [
    ['https://doi.org/10.1088/1741-2560/5/4/010', 'https://europepmc.org/article/MED/19015583'],
    ['https://doi.org/10.1088/1741-2560/4/3/S04', 'https://europepmc.org/article/MED/17873416'],
  ]) {
    const original = HISTORICAL_RECORDING_ROWS.find(row => row.DOI === doi);
    assert.ok(original);
    const selected = HISTORICAL_RECORDING.points.find(row => row.id === original.id);
    if (selected) assert.equal(selected.sourceUrl, alternate);
    const { included } = scanSources();
    assert.ok(included.has(alternate), 'Same-DOI landing is included even for an unselected tracker row');
    assert.equal(included.has(doi.toLowerCase()), false);
  }
});

test('verified company, dataset, schema, curation and syndicated-release destinations replace broken links', () => {
  const companies = csv('data/funding-index/companies.csv');
  assert.equal(companies.find(row => row.slug === 'subsense').website, 'https://subsense-bci.com/');
  const neuro = companies.find(row => row.slug === 'neucyber-neurotech');
  assert.equal(neuro.website, 'https://en.cibr.ac.cn/detail/cibrNewsnews/b8dbf43633cc4311a9798874fb0d435e');
  assert.equal(neuro.website_label, 'Institutional profile (CIBR)');
  const rounds = csv('data/funding-index/rounds.csv');
  assert.equal(rounds.find(row => row.company_slug === 'paradromics' && row.announced_on === '2018-06-11').source_url, 'https://www.biospace.com/brain-machine-interface-company-paradromics-secures-a-7-million-series-seed-led-by-arkitekt-ventures');
  const subsenseSource = 'https://www.biospace.com/press-releases/subsense-expands-financing-to-27-million-to-accelerate-r-d-for-non-surgical-brain-computer-interfaces';
  const additional = rounds.filter(row => row.company_slug === 'subsense' && row.source_url === subsenseSource);
  assert.equal(additional.length, 1, 'one financing for the exact issuer-release identity, never the adjacent $17m seed');
  assert.equal(additional[0].announced_on, '2025-12-12', 'BioSpace publication date; Dec 11 belongs to the separate HIT Consultant report');
  assert.equal(additional[0].date_basis, 'reported');
  assert.equal(additional[0].stage, 'Additional financing', 'the release does not establish a formal seed extension');
  assert.equal(additional[0].amount_usd_m, '10', 'incremental amount, not $27m cumulative funding');
  assert.equal(additional[0].investors, 'Golden Falcon Capital');
  assert.match(readFileSync('data/market-memo-q1-2026/provenance.md', 'utf8'), /https:\/\/neurotechnology.substack.com\/p\/2024-funding-snapshot/);
  const size = readFileSync('docs/public-data-size-audit.md', 'utf8');
  assert.match(size, /https:\/\/github.com\/bocklab\/temca2-catmaid\/blob\/7449966d688e3d8adc9455bd93d0fca84bad410a\/download\/README.md/);
  assert.doesNotMatch(size, /current instructions recommend v14/);
  const schema = 'https://github.com/protocol/neuro-atlas/blob/b6f99efaa80251c4fbbe608a329776617ae383ac/src/lib/field-velocity/schema.ts';
  assert.equal(json('src/data/field-velocity/neurotech.snapshot.json.provenance.json').schemaSource, schema);
  assert.ok(readFileSync('scripts/sync-performance-curves.ts', 'utf8').includes(schema));
  assert.ok(scanSources().included.has(schema));
});


test('an unrelated active citation cannot hide behind historical replacement aliases', () => {
  const originalRead = fs.readFileSync;
  const bad = 'https://www.businesswire.com/news/home/20180611005260/en/Brain-Machine-Interface-Company-Paradromics-Secures-7-Million';
  let injected = false;
  fs.readFileSync = (path, ...options) => {
    const bytes = originalRead(path, ...options);
    if (path !== 'src/data/draft-chart-evidence.json') return bytes;
    const evidence = JSON.parse(bytes);
    const point = Object.values(evidence).flatMap(record => record.plots ?? []).flatMap(plot => plot.points ?? []).find(point => point.sourceUrl);
    assert.ok(point);
    point.sourceUrl = bad;
    injected = true;
    return JSON.stringify(evidence);
  };
  syncBuiltinESMExports();
  try {
    const { included } = scanSources();
    assert.equal(injected, true, 'Probe must actually replace an active sourceUrl in memory');
    assert.ok(included.has(bad), 'Unmapped active broken literal must remain visible to exact-directory coverage');
    assert.ok(included.get(bad).some(row => row.path === 'src/data/draft-chart-evidence.json'));
    const catalog = new Set(Object.values(json('src/data/methodology-sources.json')).flat().map(([url]) => url));
    assert.equal(catalog.has(bad), false, 'Exact coverage must now report the unexpected active citation');
  } finally {
    fs.readFileSync = originalRead;
    syncBuiltinESMExports();
  }
});
