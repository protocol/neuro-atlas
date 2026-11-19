import test from 'node:test';
import assert from 'node:assert/strict';
import { CONNECTOMICS_BACKFILL } from '../src/data/connectomics-backfill.ts';
import { METRIC_CHART_EVIDENCE } from '../src/data/metric-chart-visibility.ts';

const plots = Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots);
const plot = id => plots.find(item => item.id === id);
const neurons = plot('largest-connectome-neurons');
const neuronPoint = id => neurons.points.find(point => point.id === id);
const maleUrl = 'https://www.biorxiv.org/content/10.1101/2025.10.09.680999v2.full';
const eyewireUrl = 'https://www.biorxiv.org/content/10.64898/2026.05.28.727403v1';

test('MaleCNS is a 2025 proofread and annotated CNS neuron checkpoint', () => {
  const point = neuronPoint('malecns-neurons-2025');
  assert.ok(point, 'Missing the MaleCNS neuron checkpoint');
  assert.deepEqual([point.x, point.y, point.qualifier, point.sourceUrl], [2025, 166691, undefined, maleUrl]);
  assert.match(point.dateLabel, /2025-10-30 · preprint v2/);
  assert.match(point.quote, /identified, proofread and annotated 166,691 neurons \(including sensory axons\)/);
  assert.match(point.note, /brain and nerve cord.*electron microscopy.*proofread.*sensory axons.*row 115/i);
});

test('Eyewire II is a derived lower bound across three adult mouse retinal classes', () => {
  const point = neuronPoint('eyewire-ii-neurons-2026');
  assert.ok(point, 'Missing the Eyewire II neuron checkpoint');
  assert.deepEqual([point.x, point.y, point.qualifier, point.sourceUrl], [2026, 25000, '>', eyewireUrl]);
  assert.match(point.dateLabel, /2026-06-01 · preprint v1/);
  assert.equal(point.quote, 'Human proofreading of an automated reconstruction has so far yielded more than 8, 000 bipolar cells, 13, 000 amacrine cells, and 4, 000 retinal ganglion cells.');
  assert.match(point.note, /retina.*electron microscopy.*8,000 bipolar.*13,000 amacrine.*4,000 retinal ganglion.*row 124/i);
  assert.match(point.note, /synaptic ribbons.*conventional synapse detection.*in progress/i);
});

test('recent catalog records retain dataset identity, exact evidence and sheet row separately', () => {
  for (const [id, family, species, region, row, date, version] of [
    ['malecns-neurons-2025', 'MaleCNS', 'Drosophila melanogaster', 'Adult male brain and nerve cord', 115, '2025-10-30', 'preprint v2'],
    ['eyewire-ii-neurons-2026', 'Eyewire II', 'Mus musculus', 'Adult mouse retina', 124, '2026-06-01', 'preprint v1'],
  ]) {
    const record = CONNECTOMICS_BACKFILL.find(item => item.id === id);
    assert.ok(record, id);
    assert.deepEqual([record.family, record.species, record.region, record.sheetRow, record.sourceDate, record.sourceVersion], [family, species, region, row, date, version]);
    assert.equal(record.quote, neuronPoint(id).quote);
    assert.equal(record.sourceUrl, neuronPoint(id).sourceUrl);
    assert.equal(record.plotId, neurons.id);
    assert.equal(record.unit, 'neurons');
  }
});

test('recent catalog sources appear only in the neuron chart and do not create a combined series', () => {
  const recentIds = ['malecns-neurons-2025', 'eyewire-ii-neurons-2026'];
  for (const id of recentIds) {
    assert.deepEqual(plots.filter(p => p.points.some(point => point.id === id)).map(p => p.id), [neurons.id]);
  }
  assert.equal(neuronPoint('microns-neurons').y, 84035);
  assert.equal(neurons.connections, undefined);
  assert.equal(neurons.referenceTrendline, undefined);
  assert.equal(neurons.referenceTrendlines, undefined);
});

test('each curated catalog row projects exactly once with a positive finite value and dated primary evidence', () => {
  assert.equal(new Set(CONNECTOMICS_BACKFILL.map(record => record.id)).size, CONNECTOMICS_BACKFILL.length);
  for (const record of CONNECTOMICS_BACKFILL) {
    assert.match(record.id, /^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    assert.ok(record.sheetRow === null || (Number.isInteger(record.sheetRow) && record.sheetRow > 1));
    assert.match(record.sourceDate, /^\d{4}(?:-\d{2}){0,2}$/);
    assert.equal(new URL(record.sourceUrl).protocol, 'https:');
    assert.notEqual(new URL(record.sourceUrl).hostname, 'docs.google.com');
    const matches = plots.flatMap(plot => plot.points.filter(point => point.id === record.id).map(point => ({ plot, point })));
    assert.equal(matches.length, 1, record.id);
    const [{ plot, point }] = matches;
    assert.equal(plot.id, record.plotId);
    assert.ok(Number.isFinite(point.y) && point.y > 0, record.id);
    assert.equal(point.x, Number(record.sourceDate.slice(0, 4)));
    assert.deepEqual([point.y, point.qualifier, point.sourceUrl, point.quote], [record.unit === 'µm³' ? record.value / 1e12 : record.value, record.qualifier, record.sourceUrl, record.quote]);
    assert.equal(point.dateLabel, `${record.sourceDate} · ${record.sourceVersion}`);
  }
});
