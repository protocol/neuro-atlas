import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
function sources(dir = new URL('../src/', import.meta.url)) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    return entry.isDirectory() ? sources(path) : /\.(tsx?|css)$/.test(entry.name) ? [[path.pathname, readFileSync(path, 'utf8')]] : [];
  });
}

test('the separate presentation layer restores live plates, compact preview identity and control placement', () => {
  const files = new Map(sources());
  assert.ok([...files.keys()].some(path => path.endsWith('/components/chart-plate.tsx')));
  assert.match(source('components/chart-plate.tsx'), /export function ChartPlate/);
  assert.match(source('components/chart-plate.tsx'), /export function ChartPreviewBrand/);
  assert.match(source('components/chart-plate.tsx'), /createPortal\(children, plate.controls\)/);
  assert.match(source('components/exploration-legend.tsx'), /plate \? "chart-plate-series"/);
  assert.match(source('app/globals.css'), /@import "\.\.\/components\/chart-plate.css"/);
});

test('the presentation split retains functional sharing, live exploration and typed DOM export custody', () => {
  assert.match(source('components/draft-chart-share.tsx'), /chartCopiedUrl/);
  assert.match(source('components/google-trends.tsx'), /chartCopiedUrl/);
  assert.match(source('components/chart-modal.tsx'), /ChartExplorationProvider entry=\{entry\}/);
  assert.match(source('components/chart-modal.tsx'), /fieldVelocityGraph\(id\.replace/);
  assert.match(source('components/chart-exploration-provider.tsx'), /data-chart-state=\{standaloneChartParams\(entry, settings\)/);
  assert.match(source('components/chart-modal-slots.tsx'), /data-chart-state=\{state\}/);
  assert.match(source('lib/chart-share-attribution.ts'), /utm_source: "neuro_atlas"/);
  assert.match(source('lib/atlas-analytics.ts'), /readChartShareAttribution/);
});
