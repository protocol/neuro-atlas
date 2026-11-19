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

test('Helmstaedter uses approximate physical imaged bounds from the catalog-linked primary paper', () => {
  const id = 'helmstaedter-2013-retina-volume';
  const point = tissue.points.find(point => point.id === id);
  assert.ok(point, 'Missing the selected historical retina tissue checkpoint');
  assert.deepEqual([point.x, point.y, point.qualifier, point.dateLabel, point.sourceUrl], [2013, 0.00000120384, '≈', '2013-08-07 · online publication', 'https://www.nature.com/articles/nature12346']);
  assert.equal(point.quote, 'this corresponds to a physical size of about 132 µm × 114 µm for each slice and a total thickness of 80 µm.');
  assert.match(point.note, /132 × 114 × 80 µm.*0\.00120384 mm³.*processed.*shrinkage/i);
  assert.match(point.note, /EM Datasets row 28/);
  assert.match(point.exportAnnotation, /≈1,203,840 µm³/);
  assert.match(tissue.curationSource.title, /shared by Forrest Collman/);
  assert.equal(tissue.connections, undefined);
  const record = CONNECTOMICS_BACKFILL.find(item => item.id === id);
  assert.deepEqual([record.value, record.unit, record.sheetRow], [132 * 114 * 80, 'µm³', 28]);
  assert.equal(CONNECTOMICS_BACKFILL.length, 6);
  assert.ok(CONNECTOMICS_BACKFILL.every(record => Number.isInteger(record.sheetRow) && record.sheetRow > 1), 'Every selected observation retains its source-catalog row');
});
