import assert from 'node:assert/strict';
import { beforeScientificAcquisitionCopy } from './sitewide-copy-scientific.mjs';
import { readFileSync } from 'node:fs';
const before = JSON.parse(readFileSync(new URL('../fixtures/exaspim-reference-before.json', import.meta.url), 'utf8'));

// Preserve the independent pre-backfill golden: restore only this separately
// asserted citation delta, never values, source coordinates or complete plots.
export function beforeExaspimReferenceCorrection(evidence) {
  const copy = beforeScientificAcquisitionCopy(evidence);
  const plot = copy['Connectomics imaging cost efficiency'].plots[0];
  const point = plot.points.find(p => p.id === 'exaspim2024');
  assert.equal(point.x, 2024);
  assert.equal(point.y, 100_000_000_000);
  assert.equal(point.sourceRole, 'Acquisition-efficiency estimate');
  assert.deepEqual(point.supportingReferences, [{
    role: 'ExA-SPIM method',
    title: 'Glaser et al. (2025) · Expansion-assisted selective plane illumination microscopy for nanoscale imaging of centimeter-scale tissues',
    url: 'https://doi.org/10.7554/eLife.91979',
  }]);
  delete point.sourceRole;
  delete point.supportingReferences;
  Object.assign(point, before.point);
  plot.scope = before.scope;
  plot.exportPointKeyNote = before.exportPointKeyNote;
  const oldFitSentence = 'ExA-SPIM 2024 author estimate included; reference 54 cites HiExM (citation mismatch). mesoSPIM excluded from expansion family.';
  const newFitSentence = 'ExA-SPIM 2024 author estimate included. mesoSPIM excluded from expansion family.';
  assert.equal(plot.referenceTrendlines[0].note, before.fitNote.replace(oldFitSentence, newFitSentence));
  plot.referenceTrendlines[0].note = before.fitNote;
  return copy;
}
