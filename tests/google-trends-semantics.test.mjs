import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as feed from '../src/lib/field-velocity/google-trends-feed.ts';
import { stageTrendsFeed, publishTrendsFeed, trendsPublishTarget } from '../scripts/lib/google-trends-feed-producer.ts';

const now = new Date('2026-10-15T23:30:00Z');
function bundle() {
  return { version: 1, sources: Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, {
    raw: readFileSync(`docs/google-trends/source/${id}.raw.json`, 'utf8'),
    request: readFileSync(`docs/google-trends/source/${id}.request.json`, 'utf8'),
  }])) };
}
function modify(input, id, change) {
  const raw = JSON.parse(input.sources[id].raw.replace(/^\)\]\}',?\r?\n/, ''));
  const metadata = JSON.parse(input.sources[id].request);
  change(raw.default.timelineData, metadata);
  input.sources[id] = { raw: JSON.stringify(raw), request: JSON.stringify(metadata) };
  return input;
}
function fingerprints(input) { return feed.trendsFingerprints(feed.validateTrendsBundle(input)); }
function localRemote(runTest) {
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa/trends-semantic-test-')), remote = resolve(dir, 'remote.git');
  const commands = [];
  const git = (args, { cwd, input, env } = {}) => {
    const result = spawnSync('git', args, { cwd, input, encoding: 'utf8', env: { ...process.env, ...env, GIT_TERMINAL_PROMPT: '0' } });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  const run = (args, options) => {
    commands.push(args);
    return git(args.map(arg => arg === trendsPublishTarget.repository ? remote : arg), options);
  };
  try {
    git(['init', '--bare', remote]);
    const stage = stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, now);
    const first = publishTrendsFeed(stage.files, 'absent', run, now);
    runTest({ stage, first, git, remote, run, commands });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('chart fingerprints ignore capture timestamps and source serialization while preserving integrity hashes', () => {
  assert.equal(typeof feed.trendsFingerprints, 'function');
  const original = bundle(), checked = bundle();
  for (const id of ['neurotech', 'neuralink']) modify(checked, id, (_rows, meta) => { meta.capturedAt = '2026-10-15T23:00:00Z'; });
  assert.deepEqual(fingerprints(checked), fingerprints(original));
  assert.notEqual(feed.validateTrendsBundle(checked).snapshot.groups[0].rawSha256, feed.validateTrendsBundle(original).snapshot.groups[0].rawSha256);
});

for (const [name, change] of [
  ['values', rows => { rows[1].value[0] = 42; rows[1].formattedValue[0] = '42'; }],
  ['missingness', rows => { rows[1].hasData[0] = false; }],
  ['literal <1', rows => { rows[1].value[0] = 0; rows[1].formattedValue[0] = '<1'; }],
]) test(`fingerprint changes only the affected chart for ${name}`, () => {
  const original = bundle();
  const before = fingerprints(original), after = fingerprints(modify(bundle(), 'neurotech', change));
  assert.notEqual(after.neurotech, before.neurotech);
  assert.equal(after.neuralink, before.neuralink);
});

test('normalization window shifts are substantive even when values are otherwise unchanged', () => {
  const shifted = bundle();
  for (const id of ['neurotech', 'neuralink']) modify(shifted, id, (rows, meta) => {
    const period = '2023-10-22 2026-10-22';
    meta.capturedAt = '2026-10-22T23:00:00Z';
    meta.widgetRequest.time = period;
    meta.exploreRequest.comparisonItem.forEach(item => { item.time = period; });
    rows.forEach(row => { row.time = String(Number(row.time) + 7 * 86400); });
  });
  const before = fingerprints(bundle()), after = fingerprints(shifted);
  for (const id of ['neurotech', 'neuralink']) assert.notEqual(after[id], before[id]);
});

test('timestamp-only checks verify the existing ref/tree then skip commit and push', () => localRemote(({ stage, first, git, remote, run, commands }) => {
  const checked = bundle();
  for (const id of ['neurotech', 'neuralink']) modify(checked, id, (_rows, meta) => { meta.capturedAt = '2026-10-15T23:00:00Z'; });
  commands.length = 0;
  const result = publishTrendsFeed({ ...stage.files, 'feed/google-trends/feed.json': JSON.stringify(checked) }, first.revision, run, now);
  assert.equal(result.revision, first.revision);
  assert.equal(result.published, false);
  assert.equal(result.verified, true);
  assert.deepEqual(result.changedCharts, []);
  assert.deepEqual(result.fingerprints, fingerprints(checked));
  assert.equal(commands.some(args => args.includes('commit-tree') || args.includes('push')), false);
  assert.equal(commands.filter(args => args.includes('ls-remote')).length, 2, 'No-op rechecks the current ref before reporting');
  assert.equal(git(['--git-dir', remote, 'rev-parse', trendsPublishTarget.ref]).trim(), first.revision);
}));

test('a semantic update publishes once with affected-chart identifiers and a parent-bound receipt', () => localRemote(({ stage, first, git, remote, run }) => {
  const changed = modify(bundle(), 'neuralink', rows => { rows[1].value[0] = 42; rows[1].formattedValue[0] = '42'; });
  const result = publishTrendsFeed({ ...stage.files, 'feed/google-trends/feed.json': JSON.stringify(changed) }, first.revision, run, now);
  assert.equal(result.published, true);
  assert.deepEqual(result.changedCharts, ['google-trends-neuralink']);
  assert.notEqual(result.revision, first.revision);
  assert.equal(git(['--git-dir', remote, 'rev-parse', `${result.revision}^`]).trim(), first.revision);
}));

for (const corruption of ['symlink', 'executable', 'empty directory']) test(`no-op rejects an existing ${corruption} outside the exact regular-file tree contract`, () => localRemote(({ stage, first, git, remote, run, commands }) => {
  const g = (args, input) => git(['--git-dir', remote, ...args], { input });
  const feedBlob = g(['rev-parse', `${first.revision}:feed/google-trends/feed.json`]).trim();
  const configBlob = g(['rev-parse', `${first.revision}:vercel.json`]).trim();
  const mode = corruption === 'symlink' ? '120000' : corruption === 'executable' ? '100755' : '100644';
  const leaf = g(['mktree'], `${mode} blob ${feedBlob}\tfeed.json\n`).trim();
  const directory = g(['mktree'], `040000 tree ${leaf}\tgoogle-trends\n`).trim();
  const extra = corruption === 'empty directory' ? `040000 tree ${g(['mktree'], '').trim()}\tempty\n` : '';
  const tree = g(['mktree'], `${extra}040000 tree ${directory}\tfeed\n100644 blob ${configBlob}\tvercel.json\n`).trim();
  const corrupt = g(['-c', 'user.name=Synthetic fixture', '-c', 'user.email=fixture@example.invalid', 'commit-tree', tree, '-p', first.revision, '-m', 'Synthetic invalid tree']).trim();
  g(['update-ref', trendsPublishTarget.ref, corrupt, first.revision]);
  commands.length = 0;
  assert.throws(() => publishTrendsFeed(stage.files, corrupt, run, now), /tree|paths|regular/i);
  assert.equal(commands.some(args => args.includes('commit-tree') || args.includes('push')), false);
}));

test('a concurrent data ref change invalidates a no-op receipt before success is reported', () => localRemote(({ stage, first, run, commands }) => {
  const raced = (args, options) => {
    if (args.includes('ls-remote') && commands.some(command => command.includes('fetch'))) return 'a'.repeat(40) + '\t' + trendsPublishTarget.ref + '\n';
    return run(args, options);
  };
  commands.length = 0;
  assert.throws(() => publishTrendsFeed(stage.files, first.revision, raced, now), /changed.*no-op/i);
  assert.equal(commands.some(args => args.includes('commit-tree') || args.includes('push')), false);
}));
