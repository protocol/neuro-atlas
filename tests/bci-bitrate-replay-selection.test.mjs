import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function replay(csv) {
  const dir = mkdtempSync('/opt/data/tmp/bci-replay-');
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
