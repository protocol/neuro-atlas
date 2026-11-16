import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as imported from '../src/data/bci-bitrate.ts';
const data = imported.default ?? imported;
const original = JSON.parse(readFileSync(new URL('../src/data/bci-bitrate.source.json', import.meta.url), 'utf8'));
const plot = data.BCI_BITRATE_EVIDENCE.plots[0];
const bits = Math.log2(28);

test('one 28-symbol code-equivalent convention converts all existing speech and handwriting inputs without an error penalty', () => {
  assert.equal(data.BCI_TEXT_ALPHABET_SIZE, 28);
  assert.equal(data.BCI_TEXT_BITS_PER_CHARACTER, bits);
  assert.equal(data.BCI_TEXT_CHARACTERS_PER_WORD, 5);
  assert.equal(data.BCI_TEXT_CONVERSION.bitsPerWord, 5 * bits);
  assert.equal(data.BCI_TEXT_CONVERSION.bitsPerCharacter, bits);
  for (const point of original.observations.filter(p => p.group === 'speech' || p.group === 'handwriting')) {
    const row = data.BCI_BITRATE_ROWS.find(r => r.id === point.id);
    const factor = point.group === 'speech' ? 5 * bits : bits;
    assert.equal(row.bps, point.nativeSource.rate.value * factor / 60, point.id);
    assert.equal(row.basisLabel, 'PL R&D estimate');
    assert.match(row.calculation, /log2\(28\)/);
    assert.match(row.calculation, /No (extra )?error (adjustment|penalty)/);
    assert.doesNotMatch(row.calculation, /16\.06|2\.6|technical report|one information bit\/character/);
    assert.equal(plot.points.find(p => p.id === row.id).calculationSource, undefined);
  }
  for (const [id, value] of [['pandarinath',4.16], ['stentrode',0.46], ['neuralink',8]]) {
    assert.equal(data.BCI_BITRATE_ROWS.find(r => r.id === `bci-slide-${id}`).bps, value);
  }
});


test('three explicitly selected text papers replace active anonymous coordinates without claiming original-dot attribution', () => {
  const selected = [
    { suffix: '2015-lower', name: /Bacher/, value: 9.4, unit: 'correct characters/minute', expected: 9.4 * bits / 60, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4426256/#F3', date: '2014-11-10', task: /radial.*completion off/i, title: 'Neural point-and-click communication by a person with incomplete locked-in syndrome' },
    { suffix: '2016', name: /Vansteensel/, value: 33, unit: 'seconds/letter', expected: bits / 33, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5326682/', date: '2016-11-12', task: /scanning.*prediction/i, title: 'Fully Implanted Brain–Computer Interface in a Locked-In Patient with ALS' },
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
    assert.match(row.calculation, /No (extra )?error (penalty|adjustment)/);
    assert.equal(point.sourceUrl, selection.url);
    assert.ok(point.sourceTitle.includes(selection.title));
    assert.match(point.label, selection.name);
    assert.doesNotMatch(point.label, /unconfirmed|unlabeled/i);
    assert.equal(point.candidateSources, undefined);
    assert.match(point.note, /selected paper-backed observation/i);
    assert.match(point.note, /not.*(confirmed|confirmation).*original/i);
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
      assert.match(point.annotation, /log2\(28\)|4\.8 bits\/char/);
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


test('the reader method explains 4.8 as a hypothetical equiprobable code equivalent without claiming entropy, storage or error-standardization', () => {
  const note = plot.seriesNote;
  assert.match(note, /equiprobable 28-symbol modeling alphabet/i);
  assert.match(note, /26 letters.*space.*extra symbol/i);
  assert.match(note, /log2\(28\).*4\.8/);
  assert.match(note, /five characters per word.*including spaces/i);
  assert.match(note, /normalization convention.*not measured/i);
  assert.match(note, /finite.codebook equivalent/i);
  assert.match(note, /not.*(actual|task).*keyboard/i);
  assert.match(note, /not.*English entropy/i);
  assert.match(note, /not.*8.bit storage/i);
  assert.match(note, /correlations.*language.model/i);
  assert.match(note, /not.*measured neural/i);
  assert.match(note, /No extra WER\/CER penalty/);
  assert.match(note, /correct.*correction time/i);
  assert.match(note, /gross.*(speech|handwriting)/i);
  assert.match(note, /9.*text.*fit.*5.*context.*excluded/i);
  const activeCopy = [note, data.BCI_BITRATE_CHART.definition, data.BCI_BITRATE_EVIDENCE.summary, data.BCI_BITRATE_EVIDENCE.gapReason, ...plot.points.map(p => p.note)].join(' ');
  assert.doesNotMatch(activeCopy, /16\.06|6\.18|one information bit\/character|five.bits\/word|four anonymous.*unavailable/i);
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

test('reader-facing error labels omit internal unit suffixes while preserving native error values', () => {
  for (const row of data.BCI_BITRATE_ROWS.filter(r => r.nativeRateUnit === 'words/minute' && r.nativeError)) {
    assert.match(row.reportedResult, new RegExp(`${row.nativeError.value}% word error rate\\.`));
    assert.doesNotMatch(row.reportedResult, /error rate pct/);
  }
});
