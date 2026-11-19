import test from 'node:test';
import assert from 'node:assert/strict';
import { CONNECTOMICS_BACKFILL } from '../src/data/connectomics-backfill.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';

const neurons = METRIC_CHART_EVIDENCE['Largest published connectome over time'].plots[0];
const tissue = METRIC_CHART_EVIDENCE['Brain tissue mapped over time'].plots[0];
const expectedCounts = [
  ['white-1986-canonical-neurons', 1986, 302, 9, '1986-11-12 · print publication', 'https://doi.org/10.1098/rstb.1986.0056', /total complement of 302 neurons/, /composite.*overlapping.*pharyngeal connectivity.*previously/i],
  ['helmstaedter-2013-retina-neurons', 2013, 950, 28, '2013-08-07 · online publication', 'https://www.nature.com/articles/nature12346', /dense reconstruction of 950 neurons/, /840.*110 orphan.*173 glial.*boundary-truncated/i],
  ['ryan-2016-ciona-cns-neurons', 2016, 177, 39, '2016-12-06 · online publication', 'https://elifesciences.org/articles/16962', /larva’s 177 CNS neurons/, /axons and presynaptic sites.*301.*rostral and caudal/i],
];

for (const [id, year, count, sheetRow, dateLabel, sourceUrl, quote, scope] of expectedCounts) {
  test(`${id} retains the paper’s reported cohort, date and scope`, () => {
    const point = neurons.points.find(point => point.id === id);
    assert.ok(point, `Missing the source-qualified ${id} checkpoint`);
    assert.deepEqual([point.x, point.y, point.qualifier, point.dateLabel, point.sourceUrl], [year, count, undefined, dateLabel, sourceUrl]);
    assert.match(point.quote, quote);
    assert.match(point.note, scope);
    assert.match(point.note, new RegExp(`EM Datasets row ${sheetRow}\\.`));
    assert.equal(CONNECTOMICS_BACKFILL.find(record => record.id === id).unit, 'neurons');
  });
}

test('Mishchenko uses the published 336 µm³ for a single rat CA1 V1 volume and converts to cm³', () => {
  const id = 'mishchenko-2010-v1-neuropil';
  const point = tissue.points.find(point => point.id === id);
  assert.ok(point, 'Missing the pre-2011 rat CA1 tissue checkpoint');
  assert.deepEqual([point.x, point.y, point.qualifier, point.dateLabel, point.sourceUrl], [2010, 3.36e-10, '≈', '2010-09-23 · journal issue', 'https://doi.org/10.1016/j.neuron.2010.08.014']);
  assert.equal(point.quote, '9.1 × 9.0 × 4.1 = 336μm3');
  assert.match(point.note, /one.*V1.*336 µm³.*0\.000000336 mm³.*processed/i);
  assert.doesNotMatch(point.note, /EM Datasets row/);
  assert.match(point.exportAnnotation, /≈336 µm³/);
  assert.match(tissue.scope, /rat/);
  assert.equal(tissue.curationSource, undefined);
  assert.equal(tissue.connections, undefined);
  const record = CONNECTOMICS_BACKFILL.find(item => item.id === id);
  assert.deepEqual([record.value, record.unit, record.sheetRow], [336, 'µm³', null]);
});
