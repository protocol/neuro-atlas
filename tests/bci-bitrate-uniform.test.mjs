import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as imported from '../src/data/bci-bitrate.ts';
const data = imported.default ?? imported;
const original = JSON.parse(readFileSync(new URL('../src/data/bci-bitrate.source.json', import.meta.url), 'utf8'));
const plot = data.BCI_BITRATE_EVIDENCE.plots[0];
const bits = Math.log2(28);

test('speech uses 1 assumed bit/character and 5 assumed characters/word while handwriting retains its symbol equivalent', () => {
  assert.equal(data.BCI_SPEECH_BITS_PER_CHARACTER, 1);
  assert.equal(data.BCI_SPEECH_CHARACTERS_PER_WORD, 5);
  assert.equal(data.BCI_SPEECH_BITS_PER_WORD, 5);
  assert.deepEqual(data.BCI_SPEECH_CONVERSION, { basis: 'english-entropy', bitsPerCharacter: 1, charactersPerWord: 5, bitsPerWord: 5 });
  assert.equal(data.BCI_TEXT_ALPHABET_SIZE, 28);
  assert.equal(data.BCI_TEXT_BITS_PER_CHARACTER, bits);
  assert.deepEqual(data.BCI_TEXT_CONVERSION, { basis: 'equiprobable-alphabet', alphabetSize: 28, bitsPerCharacter: bits });
  const speech = original.observations.filter(p => p.group === 'speech');
  assert.equal(speech.length, 5);
  for (const point of [...speech, original.observations.find(p => p.group === 'handwriting')]) {
    const row = data.BCI_BITRATE_ROWS.find(r => r.id === point.id);
    const factor = point.group === 'speech' ? 5 : bits;
    assert.equal(row.bps, point.nativeSource.rate.value * factor / 60, point.id);
    assert.equal(row.basisLabel, 'PL R&D estimate');
    assert.match(row.calculation, point.group === 'speech' ? /5 assumed characters\/word × 1 assumed bit\/character/ : /log2\(28\)/);
    if (point.group === 'speech') {
      assert.doesNotMatch(row.calculation, /log2\(28\)/);
      assert.match(row.calculation, /context-dependent English-entropy model/);
    }
    assert.match(row.calculation, /conversion retains the gross rate/);
    assert.doesNotMatch(row.calculation, /16\.06|2\.6|technical report/);
    assert.equal(row.nativeRateValue, point.nativeSource.rate.value);
    assert.equal(row.nativeRateUnit, point.nativeSource.rate.unit);
    assert.equal(row.nativeRateStatistic, point.nativeSource.rate.statistic);
    assert.deepEqual(row.nativeError, point.nativeSource.rate.error ?? null);
    assert.equal(row.task, point.nativeSource.rate.task);
    assert.equal(row.fitIncluded, true);
  }
  for (const [id, value] of [['pandarinath',4.16], ['stentrode',0.46], ['neuralink',8]]) {
    assert.equal(data.BCI_BITRATE_ROWS.find(r => r.id === `bci-slide-${id}`).bps, value);
  }
});


test('three selected text papers expose their native inputs and evaluation conditions', () => {
  const selected = [
    { suffix: '2015-lower', name: /Bacher/, value: 9.4, unit: 'correct characters/minute', expected: 9.4 * bits / 60, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3', date: '2014-11-10', task: /radial.*completion off/i, title: 'Neural point-and-click communication by a person with incomplete locked-in syndrome' },
    { suffix: '2016', name: /Vansteensel/, value: 33, unit: 'seconds/letter', expected: bits / 33, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/', date: '2016-11-12', task: /Prediction-assisted scanning ECoG brain-click spelling/i, title: 'Fully Implanted Brain–Computer Interface in a Locked-In Patient with ALS' },
    { suffix: '2018', name: /Milekovic.*Sarma/, value: 6.88, unit: 'correct characters/minute', expected: 6.88 * bits / 60, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6093965/#F0008', date: '2018-04-25', task: /T6.*FlashSpeller.*completion/i, title: 'Stable long-term BCI-enabled communication in ALS and locked-in syndrome using LFP signals' },
  ];
  for (const selection of selected) {
    const id = 'bci-slide-unlabeled-cursor-' + selection.suffix;
    const point = plot.points.find(p => p.id === id);
    const row = data.BCI_BITRATE_ROWS.find(r => r.id === id);
    assert.equal(row.bps, selection.expected, id);
    assert.equal(row.nativeRateValue, selection.value);
    assert.equal(row.nativeRateUnit, selection.unit);
    assert.equal(row.sourceDate, selection.date);
    assert.match(row.task, selection.task);
    assert.equal(row.basisLabel, 'PL R&D estimate');
    assert.match(row.calculation, /log2\(28\)/);
    assert.match(row.calculation, selection.suffix === '2016' ? /WER\/CER factors are omitted from the conversion/ : /Correct CPM includes correction time, so the conversion uses that rate directly/);
    assert.equal(point.sourceUrl, selection.url);
    assert.ok(point.sourceTitle.includes(selection.title));
    assert.match(point.label, selection.name);
    assert.doesNotMatch(point.label, /unconfirmed|unlabeled/i);
    assert.equal(point.candidateSources, undefined);
    assert.match(point.note, /PL R&D estimate.*Reported input:/i);
    assert.ok(point.note.includes(row.reportedResult));
    assert.notEqual(point.y, original.observations.find(p => p.id === id).approximateBps);
  }
  assert.match(data.BCI_BITRATE_ROWS.find(r => r.id.endsWith('2015-lower')).reportedResult, /9\.4 ± 3\.2.*correct/);
  assert.match(data.BCI_BITRATE_ROWS.find(r => r.id.endsWith('2018')).reportedResult, /6\.88 ± 0\.33.*correct/);
  assert.doesNotMatch(plot.points.find(p => p.id.endsWith('cursor-2016')).group, /cursor/i);
  assert.doesNotMatch(plot.points.find(p => p.id.endsWith('cursor-2018')).group, /cursor/i);
});


test('the descriptive fit selects only nine converted-text rows while all five context marks remain visible and explicitly excluded', () => {
  const rows = data.BCI_BITRATE_ROWS;
  const fitted = rows.filter(r => r.fitIncluded);
  assert.equal(fitted.length, 9);
  assert.equal(data.BCI_BITRATE_CONTEXT_COUNT, 5);
  assert.equal(plot.points.length, 14);
  assert.deepEqual(plot.points.map(p => [p.id,p.x]), original.observations.map(p => [p.id,p.slideYear]));
  assert.deepEqual(rows.filter(r => !r.fitIncluded).map(r => r.id), [
    'bci-slide-kennedy-bakay', 'bci-slide-unlabeled-cursor-2015-upper',
    'bci-slide-pandarinath', 'bci-slide-neuralink', 'bci-slide-stentrode',
  ]);
  for (const row of rows) {
    assert.equal(row.fitIncluded, row.basis === 'derived');
    const point = plot.points.find(p => p.id === row.id);
    assert.match(point.annotation, row.fitIncluded ? /text-equivalent.*fit included/ : /context · excluded from fit/);
  }
  assert.equal(data.BCI_BITRATE_FIT.n, 9);
  assert.equal(data.BCI_BITRATE_FIT.xOrigin, 2015);
  assert.deepEqual(data.BCI_BITRATE_FIT.points.map(p => p.x), [2015,2025]);
  const xs = fitted.map(r => original.observations.find(p => p.id === r.id).slideYear - 2015);
  const ys = fitted.map(r => Math.log10(r.bps));
  const meanX = xs.reduce((a,b) => a+b,0)/9, meanY = ys.reduce((a,b) => a+b,0)/9;
  const slope = xs.reduce((s,x,i) => s+(x-meanX)*(ys[i]-meanY),0)/xs.reduce((s,x) => s+(x-meanX)**2,0);
  const intercept = meanY-slope*meanX;
  const r2 = 1-ys.reduce((s,y,i) => s+(y-intercept-slope*xs[i])**2,0)/ys.reduce((s,y) => s+(y-meanY)**2,0);
  assert.ok(Math.abs(data.BCI_BITRATE_FIT.slopeLog10PerX-slope) < 1e-12);
  assert.ok(Math.abs(data.BCI_BITRATE_FIT.interceptLog10-intercept) < 1e-12);
  assert.ok(Math.abs(data.BCI_BITRATE_FIT.rSquaredLog10-r2) < 1e-12);
  assert.match(plot.referenceTrendline.label, /9 text-equivalent points/);
  assert.match(plot.referenceTrendline.label, /R²\(log10\)/);
  assert.match(plot.referenceTrendline.note, /5 context.*excluded/i);
  assert.match(plot.scope, /14.*9.*5.*excluded/i);
  assert.match(plot.yLabel, /text-equivalent.*native.task context/i);
});


test('each exported row and concise image key retain native input, conversion, assistance and gross versus correct basis', () => {
  const quotes = JSON.parse(readFileSync(new URL('./fixtures/bci-bitrate-selected-text.json', import.meta.url),'utf8'));
  for (const [suffix,key] of [['2015-lower','bacher'],['2016','vansteensel'],['2018','milekovic']]) {
    assert.equal(plot.points.find(p => p.id.endsWith('cursor-'+suffix)).quote, quotes[key].quote);
  }
  for (const row of data.BCI_BITRATE_ROWS) {
    const point = plot.points.find(p => p.id === row.id);
    assert.equal(row.referenceYear, point.x);
    assert.equal(row.sourceUrl, point.sourceUrl);
    assert.ok(row.reportedResult && row.calculation && row.rateBasis && row.task, row.id);
    assert.match(point.note, row.fitIncluded ? /fit included/i : /context.*excluded from fit/i);
    if (row.fitIncluded) {
      assert.ok(Number.isFinite(row.nativeRateValue), row.id);
      assert.ok(row.nativeRateUnit, row.id);
      assert.ok(point.annotation.includes(String(row.nativeRateValue)), row.id);
      assert.match(point.annotation, row.nativeRateUnit === 'words/minute' ? /5 × 1 bit\/char/ : /log2\(28\)/);
      assert.match(point.annotation, /gross|correct|timing/);
      assert.ok(row.assistance && point.annotation.includes(row.assistance), row.id);
      assert.ok(point.annotation.length <= 330, 'Keep standalone PNG keys concise: '+row.id);
    }
  }
  const hand = data.BCI_BITRATE_ROWS.find(r => r.id === 'bci-slide-handwriting');
  assert.equal(hand.nativeRateValue, 90);
  assert.match(hand.rateBasis, /gross/);
  assert.match(plot.points.find(p => p.id === hand.id).annotation, /5\.4% CER/);
  for (const row of data.BCI_BITRATE_ROWS.filter(r => r.nativeRateUnit === 'words/minute')) {
    const native = original.observations.find(p => p.id === row.id).nativeSource.rate;
    assert.equal(row.nativeRateValue, native.value);
    assert.equal(row.nativeError?.value ?? null, native.error?.value ?? null);
    assert.match(row.rateBasis, /gross/);
    assert.match(plot.points.find(p => p.id === row.id).annotation, native.error ? /% WER/ : /WER unpaired/);
  }
  for (const suffix of ['2015-lower','2018']) assert.match(data.BCI_BITRATE_ROWS.find(r => r.id.endsWith('cursor-'+suffix)).rateBasis,/correct/);
  assert.match(data.BCI_BITRATE_ROWS.find(r => r.id.endsWith('cursor-2016')).rateBasis, /timing/);
});


test('the reader method distinguishes speech English-entropy and retained symbol equivalents in a mixed-convention descriptive fit', () => {
  const note = plot.seriesNote;
  assert.match(note, /Speech.*1 assumed bit\/character/);
  assert.match(note, /context-dependent English-entropy model/);
  assert.match(note, /Handwriting and text selection\/scanning use/);
  assert.match(note, /mixed.convention.*descriptive fit/i);
  assert.match(plot.referenceTrendline.note, /mixed.convention/i);
  assert.match(plot.referenceTrendline.label, /mixed models/i);
  assert.doesNotMatch([note, data.BCI_BITRATE_CHART.definition, data.BCI_BITRATE_CHART.constraint, plot.referenceTrendline.note].join(' '), /\buniform(?:ly)? (?:text )?conversion|one (?:shared )?convention across|same (?:28-symbol|coding) convention/i);
  assert.match(note, /equiprobable 28-symbol modeling alphabet/i);
  assert.match(note, /26 letters.*space.*extra symbol/i);
  assert.match(note, /log2\(28\).*4\.8/);
  assert.match(note, /five characters per word.*including spaces/i);
  assert.match(note, /normalization convention/);
  assert.match(note, /word.length.*assumptions/i);
  assert.match(note, /finite.codebook equivalent/i);
  assert.match(note, /chosen modeling alphabet; task keyboards vary/i);
  assert.match(note, /Measured English entropy and 8-bit storage use different definitions/i);
  assert.match(note, /Measured English entropy and 8-bit storage use different definitions/i);
  assert.match(note, /correlations.*language.model/i);
  assert.match(note, /estimates describe task output under these different forms of assistance/i);
  assert.match(note, /Speech and handwriting conversions retain gross pace, with WER\/CER reported separately/);
  assert.match(note, /correct.*correction time/i);
  assert.match(note, /Speech and handwriting conversions retain gross pace/i);
  assert.match(note, /fit.*9.*text.*5.*context.*excluded/i);
  const activeCopy = [note, data.BCI_BITRATE_CHART.definition, data.BCI_BITRATE_EVIDENCE.summary, data.BCI_BITRATE_EVIDENCE.gapReason, ...plot.points.map(p => p.note)].join(' ');
  assert.doesNotMatch(activeCopy, /16\.06|6\.18|four anonymous.*unavailable/i);
  assert.match(data.BCI_BITRATE_EVIDENCE.summary, /9.*3.*2/);
});


test('the qualified communication-rate title keeps the existing public URL and legacy aliases', async () => {
  assert.equal(plot.title, 'BCI communication rates over time');
  assert.equal(data.BCI_BITRATE_CHART.title, plot.title);
  const { fieldVelocityLink, canonicalPerformanceAnchor } = await import('../src/data/field-velocity-links.ts');
  const { DRAFT_CHART_LINKS } = await import('../src/data/draft-chart-links.ts');
  const link = fieldVelocityLink('bci-information-transfer-over-time');
  assert.equal(link.title, plot.title);
  assert.equal(link.slug, 'bci-information-transfer-over-time');
  assert.equal(link.target, 'metric-panel-bci-bitrate');
  assert.equal(DRAFT_CHART_LINKS.find(p => p.id === 'draft-bci-bitrate').title, plot.title);
  for (const alias of ['draft-bci-bitrate','metric-bci-bitrate','draft-panel-bci-bitrate','metric-panel-bci-bitrate']) {
    assert.equal(canonicalPerformanceAnchor(alias), 'bci-information-transfer-over-time');
  }
});

test('active method documents both conversion models and the descriptive fit', () => {
  const method = readFileSync(new URL('../docs/bci-bitrate.md', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../docs/bci-study-data/README.md', import.meta.url), 'utf8');
  const ref = 'https://cs.stanford.edu/people/eroberts/courses/soco/projects/1999-00/information-theory/entropy_of_english_9.html';
  for (const copy of [method, readme]) {
    assert.ok(copy.includes(ref), 'Link the exact owner-provided conversion reference');
    assert.match(copy, /1 assumed bit\/character/);
    assert.match(copy, /context-dependent/);
    assert.match(copy, /mixed.convention.*descriptive/i);
    assert.doesNotMatch(copy, /one declared text-to-bit-equivalent rule|All use the same|same formulas everywhere|conversion is uniform|under one coding convention|common conversion/i);
  }
  assert.match(method, /90 × log2\(28\) \/ 60/);
  for (const row of data.BCI_BITRATE_ROWS.filter(row => row.nativeRateUnit === 'words/minute')) {
    assert.ok(method.includes(`${row.nativeRateValue} × 5 × 1 / 60`));
    assert.ok(method.includes(String(row.bps)));
  }
  const intercept = Number(method.match(/log10\(text-equivalent rate\) = ([-\d.]+)/)?.[1]);
  const slope = Number(method.match(/\+ ([\d.]+) × \(year - 2015\)/)?.[1]);
  const r2 = Number(method.match(/R²\(log10 rate\) = ([\d.]+)/)?.[1]);
  assert.ok(Math.abs(intercept - data.BCI_BITRATE_FIT.interceptLog10) < 1e-12);
  assert.ok(Math.abs(slope - data.BCI_BITRATE_FIT.slopeLog10PerX) < 1e-12);
  assert.ok(Math.abs(r2 - data.BCI_BITRATE_FIT.rSquaredLog10) < 1e-12);
  assert.match(method, /conversion_basis/);
  assert.match(method, /normalization_bits_per_character/);
});

test('reader-facing error labels omit internal unit suffixes while preserving native error values', () => {
  for (const row of data.BCI_BITRATE_ROWS.filter(r => r.nativeRateUnit === 'words/minute' && r.nativeError)) {
    assert.match(row.reportedResult, new RegExp(`${row.nativeError.value}% word error rate\\.`));
    assert.doesNotMatch(row.reportedResult, /error rate pct/);
  }
});
