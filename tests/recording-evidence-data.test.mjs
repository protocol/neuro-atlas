import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Fail on the missing scientific contract, not an unresolved import.
const { RECORDING_VIEWS = [] } = existsSync('src/data/recording-evidence.ts')
  ? await import('../src/data/recording-evidence.ts') : {};

test('recording evidence separates audited electrical units, human implant channels and optical signals', () => {
  assert.deepEqual(RECORDING_VIEWS.map(view => view.id), ['electrical', 'human-channels', 'optical']);
  const [electrical, human, optical] = RECORDING_VIEWS;
  assert.deepEqual(electrical.points.map(p => [p.id, p.value]), [['jun-2017', 741], ['stringer-2019', 2668], ['trautmann-2025', 1012]]);
  assert.match(electrical.points[0].note, /putative single/);
  assert.match(electrical.points[1].note, /stable.*hour.*final paper/i);
  assert.match(electrical.points[2].note, /subjective.*curation/i);
  assert.deepEqual(human.points.map(p => p.value), [256, 3000]);
  const card = human.points[0], neuralink = human.points[1];
  assert.equal(card.datePrecision, 'day');
  assert.equal(card.date, '2026-06-15');
  assert.equal(card.dateBasis, 'publication');
  assert.match(card.note, /512.*features.*not.*channels/i);
  assert.match(card.note, /same implant.*2024/i);
  assert.equal(neuralink.qualifier, 'approximate');
  assert.equal(neuralink.date, '2026-09-18');
  assert.equal(neuralink.dateBasis, 'disclosure');
  assert.equal(neuralink.sourceUrl, 'https://www.youtube.com/watch?v=_j806JHhCRo&t=170s');
  assert.match(neuralink.note, /company-reported.*active.*not specified/i);
  assert.equal(optical.points.length, 1);
  assert.equal(optical.points[0].value, 1136223);
  assert.match(optical.points[0].note, /2\.2 volumes\/s/);
  assert.match(optical.points[0].preparation, /mouse.*cortex.*calcium/i);
  for (const view of RECORDING_VIEWS) {
    assert.equal(view.chartKind, 'scatter');
    assert.equal(view.extrapolation, false);
    assert.match(view.caveat, /not.*(record|neurons|spikes)/i);
    for (const p of view.points) {
      assert.ok(Number.isFinite(p.value) && p.value > 0);
      assert.ok(['publication', 'disclosure'].includes(p.dateBasis));
      for (const key of ['id', 'label', 'unit', 'preparation', 'sourceUrl', 'sourceLabel', 'quote', 'note']) assert.ok(p[key]?.trim(), key);
      assert.match(p.sourceUrl, /^https:\/\//);
      assert.ok(![2998, 3072, 512, 3880, 1127, 3029].includes(p.value));
    }
  }
  // Historical provider data/provenance remain byte-for-byte originals. New
  // curated evidence must never masquerade as a refreshed provider snapshot.
  for (const [file, hash] of [
    ['neurotech.snapshot.json', '2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee'],
    ['neurotech.snapshot.json.provenance.json', '66df3d351fd6318ed289b1d0e8299ad8da9a7f6399becda046d17baf49f48b97'],
  ]) assert.equal(createHash('sha256').update(readFileSync(`src/data/field-velocity/${file}`)).digest('hex'), hash);
});
