import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
const boundary = await import('./helpers/financing-copy-import-boundary.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const historicalNames = [
  'financing-fixes-reader', 'financing-fixes-baseline', 'financing-merge-baseline',
  'china-funding-baseline', 'paradromics-funding-baseline', 'sitewide-copy-baseline',
  'sitewide-copy-data', 'sitewide-copy-scientific', 'sitewide-copy-svg',
  'recording-hours-coverage-baseline', 'exaspim-reference-baseline',
];
const historical = historicalNames.map(name => 'tests/helpers/' + name + '.mjs');
const allowlist = {
  'tests/helpers/connectomics-provenance-baseline.mjs': ['recording-hours-coverage-baseline'],
  'tests/helpers/paradromics-funding-baseline.mjs': ['financing-merge-baseline'],
  'tests/helpers/financing-fixes-baseline.mjs': ['financing-fixes-reader', 'sitewide-copy-baseline'],
  'tests/helpers/china-funding-baseline.mjs': ['financing-merge-baseline', 'financing-fixes-baseline'],
  'tests/helpers/sitewide-copy-data.mjs': ['sitewide-copy-baseline'],
  'tests/helpers/sitewide-copy-svg.mjs': ['sitewide-copy-baseline'],
  'tests/helpers/exaspim-reference-baseline.mjs': ['sitewide-copy-scientific'],
  'tests/helpers/recording-hours-coverage-baseline.mjs': ['sitewide-copy-scientific'],
  'tests/financing-merge-compatibility.test.mjs': ['financing-fixes-baseline', 'financing-merge-baseline', 'paradromics-funding-baseline', 'china-funding-baseline'],
  'tests/funding-founding.test.mjs': ['china-funding-baseline'],
  'tests/funding-founding-ui.test.mjs': ['china-funding-baseline'],
  'tests/funding-index.test.mjs': ['china-funding-baseline'],
  'tests/notables-66.test.mjs': ['china-funding-baseline'],
  'tests/financing-copy-dispatch.test.mjs': ['financing-fixes-reader', 'sitewide-copy-baseline', 'financing-fixes-baseline'],
  'tests/bci-sensory-context.test.mjs': ['sitewide-copy-svg', 'recording-hours-coverage-baseline'],
  'tests/braingate-t15-recording-hours.test.mjs': ['sitewide-copy-scientific', 'recording-hours-coverage-baseline'],
  'tests/china-funding-compatibility.test.mjs': ['financing-merge-baseline', 'financing-fixes-baseline', 'china-funding-baseline'],
  'tests/financing-fixes-reader.test.mjs': ['financing-fixes-reader', 'financing-fixes-baseline'],
  'tests/funding-feedback-data.test.mjs': ['china-funding-baseline'],
  'tests/paradromics-reported-total.test.mjs': ['financing-fixes-baseline', 'paradromics-funding-baseline'],
  'tests/notables-64.test.mjs': ['china-funding-baseline'],
  'tests/draft-charts.test.mjs': ['sitewide-copy-scientific'],
  'tests/curated-reader-copy.test.mjs': ['exaspim-reference-baseline'],
  'tests/sitewide-copy-svg.test.mjs': ['sitewide-copy-scientific', 'sitewide-copy-svg'],
  'tests/source-audit-records.test.mjs': ['financing-fixes-baseline', 'sitewide-copy-data', 'sitewide-copy-baseline', 'paradromics-funding-baseline'],
  'tests/financing-fixes-compatibility.test.mjs': ['financing-fixes-baseline', 'financing-fixes-reader', 'china-funding-baseline', 'financing-merge-baseline', 'paradromics-funding-baseline'],
  'tests/paradromics-funding.test.mjs': ['financing-merge-baseline', 'financing-fixes-baseline', 'paradromics-funding-baseline'],
  'tests/notables-65.test.mjs': ['china-funding-baseline'],
  'tests/neuro-wide-milestones-baseline.test.mjs': ['china-funding-baseline'],
  'tests/source-audit-scope.test.mjs': ['china-funding-baseline'],
  'tests/recording-hours-coverage.test.mjs': ['recording-hours-coverage-baseline'],
  'tests/coherence-seed-history.test.mjs': ['sitewide-copy-data'],
  'tests/sitewide-copy.test.mjs': ['sitewide-copy-baseline'],
  'tests/financing-copy-mutations.test.mjs': ['financing-fixes-baseline', 'sitewide-copy-baseline'],
};
const fullAllowlist = Object.fromEntries(Object.entries(allowlist).map(([file, names]) => [file, names.map(name => 'tests/helpers/' + name + '.mjs')]));
const native = [
  'tests/financing-fixes-current-data.test.mjs', 'tests/financing-fixes-data.test.mjs',
  'tests/coherence-seed-investors.test.mjs', 'tests/financing-copy-lock.test.mjs',
  'tests/financing-date-precision-runtime-20261125.test.mjs',
  'tests/financing-source-date-guards.test.mjs',
  'tests/financing-shared-exclusion-legend-20261125.test.mjs',
  'tests/precision-reported-total-footnote.test.mjs',
  'tests/paradromics-funding-ui.test.mjs', 'tests/paradromics-reported-total-ui.test.mjs',
  'tests/source-audit-funding-ui.test.mjs', 'tests/funding-investor-evidence-ui.test.mjs',
  'tests/funding-feedback-ui.test.mjs', 'tests/link-repairs.test.mjs',
  'tests/milestones-visible-window.test.mjs',
];

test('import boundary rejects direct, transitive, dynamic and alias historical reads in native code and helper cycles', () => {
  assert.equal(typeof boundary.assertHistoricalImportBoundaries, 'function');
  const f = 'tests/helpers/financing-fixes-baseline.mjs';
  const check = (sources, roots, permitted = {}) => boundary.assertHistoricalImportBoundaries(new Map(Object.entries(sources)), [f], permitted, roots);
  for (const code of [
    "import './helpers/financing-fixes-baseline.mjs';",
    "export * from './helpers/financing-fixes-baseline.mjs';",
    "const history = import('./helpers/financing-fixes-baseline.mjs');",
    "const history = require('./helpers/financing-fixes-baseline.mjs');",
  ]) assert.throws(() => check({ 'tests/current.test.mjs': code, [f]: '' }, ['tests/current.test.mjs']), assert.AssertionError);
  assert.throws(() => check({
    'tests/current.test.mjs': "import '../src/bridge.ts';", 'src/bridge.ts': "import '../tests/helpers/financing-fixes-baseline.mjs';", [f]: '',
  }, ['tests/current.test.mjs'], { 'src/bridge.ts': [f] }), assert.AssertionError, 'even an allowlisted indirect historical reader cannot enter native code');
  assert.throws(() => check({
    'tests/current.test.mjs': "import '@/bridge';", 'src/bridge.ts': "export * from '../tests/helpers/financing-fixes-baseline.mjs';", [f]: '',
  }, ['tests/current.test.mjs'], { 'src/bridge.ts': [f] }), assert.AssertionError, 'alias resolution');
  assert.throws(() => check({ [f]: "import './bridge.mjs';", 'tests/helpers/bridge.mjs': "import './financing-fixes-baseline.mjs';" }, [], { 'tests/helpers/bridge.mjs': [f] }), assert.AssertionError, 'cycles cannot hide order');
  check({ 'tests/current.test.mjs': "// import './helpers/financing-fixes-baseline.mjs';\nconst text = 'not an import';", [f]: '' }, ['tests/current.test.mjs']);
});

test('repository historical imports stay on an exact explicit allowlist; all native/runtime/source graphs remain raw', () => {
  assert.equal(typeof boundary.assertHistoricalImportBoundaries, 'function');
  const root = new URL('../', import.meta.url).pathname;
  const files = new Map();
  const walk = directory => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const file = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:mjs|[jt]sx?)$/.test(file)) files.set(file, readFileSync(path.join(root, file), 'utf8'));
    }
  };
  for (const directory of ['src', 'scripts', 'tests']) walk(directory);
  for (const file of native) assert.ok(files.has(file), 'named native entrypoint must exist: ' + file);
  boundary.assertHistoricalImportBoundaries(files, historical, fullAllowlist, [...native, ...[...files.keys()].filter(file => file.startsWith('src/') || file.startsWith('scripts/'))]);
});
