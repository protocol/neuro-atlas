import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DRAFT_CHART_EVIDENCE } from '../src/data/draft-chart-observations.ts';
import { METRIC_CHART_EVIDENCE, RETIRED_METRIC_PLOT_IDS } from '../src/data/metric-chart-visibility.ts';

import { withoutConnectomicsBackfill } from './helpers/connectomics-provenance-baseline.mjs';

const canonical = JSON.parse(readFileSync('src/data/draft-chart-evidence.json', 'utf8'));
const points = data => Object.values(data).flatMap(evidence => evidence.plots).flatMap(plot => plot.points);
const reconstructionIds = ['flywire-neurons', 'flywire-synapses', 'flywire-fly-neuropil-2024-01-01', 'flywire-proofreading'];
const imagery = { role: 'Underlying EM image volume — FAFB', title: 'Zheng, Lauritzen et al., Cell (2018). Bock lab–led team at HHMI Janelia and collaborators.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6063995/' };
const reconstruction = { role: 'Whole-brain connectome reconstruction — FlyWire', title: 'Dorkenwald et al. and the FlyWire Consortium, Nature (2024).', url: 'https://www.nature.com/articles/s41586-024-07558-y' };

test('published FlyWire measurements link reconstruction and original FAFB imaging with explicit contribution roles in canonical and reader evidence', () => {
  for (const data of [canonical, DRAFT_CHART_EVIDENCE]) {
    for (const id of reconstructionIds) {
      const point = points(data).find(point => point.id === id);
      assert.equal(point.sourceRole, reconstruction.role, id);
      assert.equal(point.sourceTitle, reconstruction.title, id);
      assert.equal(point.sourceUrl, reconstruction.url, 'The principal metric citation remains the 2024 paper');
      assert.deepEqual(point.supportingReferences, [imagery]);
      assert.match(point.note, /FAFB image volume publicly available in 2018/);
    }
    const resource = points(data).find(point => point.id === 'fafb-image-download-2018');
    assert.equal(resource.sourceRole, imagery.role);
    assert.equal(resource.sourceTitle, imagery.title);
    assert.equal(resource.sourceUrl, imagery.url);
    assert.equal(resource.supportingReferences, undefined, 'Strengthen the existing image record rather than duplicating its citation');
    assert.match(resource.note, /FAFB image volume publicly available in 2018/);
    assert.match(resource.note, /July 19, 2018.*publication/);
    assert.match(resource.note, /earliest public-release day.*unknown/);
    assert.match(resource.note, /106 TB/);
    assert.match(resource.note, /v13.*v14/);
    assert.match(resource.note, /lossless PNG.*alternate encoding/);
  }
  const reader = points(DRAFT_CHART_EVIDENCE);
  for (const id of ['flywire-neurons', 'flywire-synapses']) {
    assert.match(reader.find(point => point.id === id).note, /44.7% postsynapse attachment/);
    assert.match(reader.find(point => point.id === id).label, /v783/);
  }
  assert.match(reader.find(point => point.id === 'flywire-synapses').note, /between the reconstructed neurons/);
});

test('all observation counts, coordinates, dates, qualifiers, quotes, groups, annotations and product encodings remain exact', () => {
  const fields = ['id', 'x', 'y', 'label', 'dateLabel', 'qualifier', 'group', 'quote', 'annotation', 'marker', 'exportAnnotation'];
  for (const [data, expected] of [[canonical, '1806768b8a3717bd31e8a986f070ca1cc125c1076f04a8e0891d368f7ac39080'], [withoutConnectomicsBackfill(DRAFT_CHART_EVIDENCE), '1c08e3db41ae6a19edee55007feef8a92143120b4ae83c087d860fb206281c74']]) {
    const protectedData = Object.entries(data).map(([title, evidence]) => [title, evidence.plots.map(plot => [plot.id, plot.points.map(point => Object.fromEntries(fields.map(field => [field, point[field]])))])]);
    assert.equal(createHash('sha256').update(JSON.stringify(protectedData)).digest('hex'), expected);
  }
  assert.ok(RETIRED_METRIC_PLOT_IDS.has('comparative-specimens'));
  assert.ok(!Object.values(METRIC_CHART_EVIDENCE).flatMap(evidence => evidence.plots).some(plot => plot.id === 'comparative-specimens'));
  const comparative = points(canonical).find(point => point.id === 'flywire-hemibrain-comparison');
  assert.equal(comparative.sourceUrl, 'https://www.nature.com/articles/s41586-024-07686-5');
  assert.equal(comparative.sourceTitle, 'Whole-brain annotation and multi-connectome cell typing of Drosophila');
  assert.equal(comparative.supportingReferences, undefined);
});
