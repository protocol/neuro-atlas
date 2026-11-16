import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function replay(csv) {
  const dir = mkdtempSync(join(tmpdir(), 'bci-replay-'));
  try {
    const path = join(dir, 'input.csv');
    writeFileSync(path, csv);
    return JSON.parse(execFileSync('python3', ['docs/bci-study-data/reproduce_fit.py', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('replay retains context observations but fits only explicit true selections', () => {
  const result = replay('id,reference_year,plotted_bps,fit_included\na,2015,1,true\nb,2025,100,true\ncontext,2020,1000000,false\n');
  assert.equal(result.observations.length, 3);
  assert.deepEqual(result.fitObservations.map(p => p.id), ['a', 'b']);
  assert.equal(result.fit.n, 2);
  assert.equal(result.fit.xOrigin, 2015);
  assert.ok(Math.abs(result.fit.slopeLog10PerX - 0.2) < 1e-12);
  assert.equal(result.fit.rSquaredLog10, 1);
});

test('replay refuses ambiguous fit selection instead of silently discarding a row', () => {
  assert.throws(() => replay('id,reference_year,plotted_bps,fit_included\na,2015,1,true\nb,2025,100,true\ncontext,2020,50,TRUE\n'), /fit_included must be exactly true or false/);
});

test('replay recalculates text equivalents from the declared alphabet and native rate', () => {
  const result = replay('id,reference_year,plotted_bps,fit_included,paper_or_company_native_rate,native_unit,normalization_alphabet_size,normalization_characters_per_word\na,2015,999,true,60,characters/minute,28,\nb,2025,999,true,60,words/minute,28,5\n');
  assert.ok(Math.abs(result.observations[0].bps - Math.log2(28)) < 1e-12, 'CPM must be recalculated, not copied from plotted_bps');
  assert.ok(Math.abs(result.observations[1].bps - 5 * Math.log2(28)) < 1e-12, 'WPM must use the declared character-per-word factor');
  assert.equal(result.observations[0].csvPlottedBps, 999);
  assert.ok(Math.abs(result.fit.slopeLog10PerX - Math.log10(5) / 10) < 1e-12);
});

test('replay recalculates speech from its explicit English-entropy weight and word length rather than alphabet or plotted values', () => {
  const result = replay('id,reference_year,plotted_bps,fit_included,paper_or_company_native_rate,native_unit,normalization_alphabet_size,normalization_characters_per_word,conversion_basis,normalization_bits_per_character\na,2021,999,true,60,words/minute,28,5,english-entropy,1\nb,2025,999,true,120,words/minute,28,4,english-entropy,2\n');
  assert.equal(result.observations[0].bps, 5);
  assert.equal(result.observations[1].bps, 16, 'Changing native WPM, bits/character and characters/word recalculates the rate');
  assert.equal(result.observations[0].csvPlottedBps, 999);
  assert.ok(Math.abs(result.fit.slopeLog10PerX - Math.log10(16 / 5) / 4) < 1e-12);
});

test('replay refuses invalid declared conversion models and nonpositive entropy weights', () => {
  const header = 'id,reference_year,plotted_bps,fit_included,paper_or_company_native_rate,native_unit,normalization_characters_per_word,conversion_basis,normalization_bits_per_character\n';
  for (const weight of ['', '0', '-1', 'NaN', 'Infinity']) {
    assert.throws(() => replay(header + `a,2021,1,true,60,words/minute,5,english-entropy,${weight}\nb,2025,2,true,60,words/minute,5,english-entropy,1\n`), /positive finite bits\/character/);
  }
  assert.throws(() => replay(header + 'a,2021,1,true,60,words/minute,5,unknown,1\nb,2025,2,true,60,words/minute,5,english-entropy,1\n'), /Unsupported conversion basis/);
});

test('replay converts the printed seconds-per-letter result without rounding to CPM', () => {
  const result = replay('id,reference_year,plotted_bps,fit_included,paper_or_company_native_rate,native_unit,normalization_alphabet_size,normalization_characters_per_word\na,2016,999,true,33,seconds/letter,28,\nb,2025,999,true,66,seconds/letter,28,\n');
  assert.ok(Math.abs(result.observations[0].bps - Math.log2(28) / 33) < 1e-12, 'Printed timing input');
  assert.ok(Math.abs(result.observations[1].bps - Math.log2(28) / 66) < 1e-12, 'Alternative timing input');
});
