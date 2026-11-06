import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';

function scratch() { mkdirSync('.qa', { recursive: true }); return mkdtempSync('.qa/trends-producer-test-'); }
test('producer stages a fresh whole-window bundle and suppresses all data-branch deployments; no implicit publish', async () => {
  const { stageTrendsFeed } = await import('../scripts/lib/google-trends-feed-producer.ts');
  const dir = scratch();
  try {
    const stage = stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, new Date('2026-10-15T23:00:00Z'));
    assert.deepEqual(Object.keys(stage.files).sort(), ['feed/google-trends/feed.json', 'vercel.json']);
    assert.equal(JSON.parse(stage.files['vercel.json']).git.deploymentEnabled, false);
    assert.equal(JSON.parse(stage.files['feed/google-trends/feed.json']).version, 1);
    assert.equal(stage.end, '2026-10-15');
    assert.equal(stage.published, false);
    assert.throws(() => stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, new Date('2026-10-15T23:00:00Z')), /fresh|exists/);
    assert.throws(() => stageTrendsFeed('docs/google-trends/source', `${dir}/old`, new Date('2026-10-30T23:00:00Z')), /window|capture/i);
    assert.equal(existsSync(`${dir}/old`), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const publicName = 'Neuro Atlas data refresh';
const publicEmail = 'neuro-atlas-data@users.noreply.github.com';
const commitMetadataFormat = '--format=format:%an%x00%ae%x00%cn%x00%ce%x00%B';
const expectedCommitMetadata = [publicName, publicEmail, publicName, publicEmail, 'Google Trends full window 2023-10-15–2026-10-15\n'].join('\0');
// Explicitly synthetic ambient identities for local tests only.
const syntheticGitIdentity = {
  GIT_AUTHOR_NAME: 'SYNTHETIC_PRIVATE_AUTHOR',
  GIT_AUTHOR_EMAIL: 'synthetic-private-author@example.invalid',
  GIT_COMMITTER_NAME: 'SYNTHETIC_PRIVATE_COMMITTER',
  GIT_COMMITTER_EMAIL: 'synthetic-private-committer@example.invalid',
};

// Explicitly synthetic markers, never public data. Every metadata object is fail-closed.
const metadataObjectPaths = [
  [], ['exploreRequest'], ['exploreRequest', 'comparisonItem', 0],
  ['widgetRequest'], ['widgetRequest', 'comparisonItem', 0],
  ['widgetRequest', 'comparisonItem', 0, 'geo'],
  ['widgetRequest', 'comparisonItem', 0, 'complexKeywordsRestriction'],
  ['widgetRequest', 'comparisonItem', 0, 'complexKeywordsRestriction', 'keyword', 0],
  ['widgetRequest', 'requestOptions'], ['widgetRequest', 'userConfig'],
];
for (const path of metadataObjectPaths) {
  for (const field of ['apiKey', 'session', 'credential', 'accountEmail']) {
    test(`publish preflight rejects synthetic ${field} at ${path.join('.') || 'root'} before any Git call`, async () => {
      const { publishTrendsFeed, DATA_BRANCH_VERCEL } = await import('../scripts/lib/google-trends-feed-producer.ts');
      for (const id of ['neurotech', 'neuralink']) {
        const sources = Object.fromEntries(['neurotech', 'neuralink'].map(group => [group, {
          raw: readFileSync(`docs/google-trends/source/${group}.raw.json`, 'utf8'),
          request: readFileSync(`docs/google-trends/source/${group}.request.json`, 'utf8'),
        }]));
        const request = JSON.parse(sources[id].request);
        path.reduce((value, key) => value[key], request)[field] = `SYNTHETIC_PRIVACY_TEST_ONLY_${field}`;
        sources[id].request = JSON.stringify(request);
        const files = { 'feed/google-trends/feed.json': JSON.stringify({ version: 1, sources }), 'vercel.json': DATA_BRANCH_VERCEL };
        const commands = [];
        const noGit = args => { commands.push(args); throw new Error('SYNTHETIC_TEST_GIT_MUST_NOT_RUN'); };
        assert.throws(() => publishTrendsFeed(files, 'absent', noGit, new Date('2026-10-15T23:00:00Z')));
        assert.deepEqual(commands, [], `${id}: rejected metadata must admit no Git reads or mutations`);
      }
    });
  }
}

test('unknown nested request metadata cannot create a staging destination', async () => {
  const { stageTrendsFeed } = await import('../scripts/lib/google-trends-feed-producer.ts');
  const { writeFileSync } = await import('node:fs');
  const dir = scratch();
  try {
    cpSync('docs/google-trends/source', `${dir}/source`, { recursive: true });
    const path = `${dir}/source/neuralink.request.json`;
    const request = JSON.parse(readFileSync(path, 'utf8'));
    request.widgetRequest.userConfig.accountEmail = 'SYNTHETIC_PRIVACY_TEST_ONLY_accountEmail';
    writeFileSync(path, JSON.stringify(request));
    assert.throws(() => stageTrendsFeed(`${dir}/source`, `${dir}/stage`, new Date('2026-10-15T23:00:00Z')));
    assert.equal(existsSync(`${dir}/stage`), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('publisher uses exact-lease Git CAS and verifies every byte on a real local bare remote; never touches main', async () => {
  const { stageTrendsFeed, publishTrendsFeed: publish, trendsPublishTarget } = await import('../scripts/lib/google-trends-feed-producer.ts');
  assert.equal(typeof publish, 'function');
  const publishTrendsFeed = (files, expected, run) => publish(files, expected, run, new Date('2026-10-15T23:00:00Z'));
  const dir = scratch(), remote = resolve(dir, 'remote.git');
  const recorded = [];
  const git = (args, { cwd, input, env } = {}) => {
    const response = spawnSync('git', args, { cwd, input, encoding: 'utf8', env: { ...process.env, ...syntheticGitIdentity, ...env } });
    if (response.status !== 0) throw new Error(response.stderr);
    return response.stdout;
  };
  const run = (args, options) => {
    recorded.push(args);
    return git(args.map(arg => arg === trendsPublishTarget.repository ? remote : arg), options);
  };
  try {
    git(['init', '--bare', remote]);
    const stage = stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, new Date('2026-10-15T23:00:00Z'));
    const first = publishTrendsFeed(stage.files, 'absent', run);
    assert.match(first.revision, /^[a-f0-9]{40}$/);
    assert.equal(first.verified, true);
    assert.equal(git(['--git-dir', remote, 'show', '--no-patch', commitMetadataFormat, first.revision]), expectedCommitMetadata);
    assert.deepEqual(git(['--git-dir', remote, 'ls-tree', '-r', '--name-only', first.revision]).trim().split('\n'), ['feed/google-trends/feed.json', 'vercel.json']);
    for (const [path, bytes] of Object.entries(stage.files)) assert.equal(git(['--git-dir', remote, 'show', `${first.revision}:${path}`]), bytes);
    assert.equal(git(['--git-dir', remote, 'show-ref', '--heads']).includes('refs/heads/main'), false);
    assert.ok(recorded.some(args => args.includes(`--force-with-lease=${trendsPublishTarget.ref}:`)));
    assert.throws(() => publishTrendsFeed(stage.files, 'absent', run), /changed|lease|expected/i);
    let raced = false;
    const racingRun = (args, options) => {
      if (args.includes('push') && !raced) {
        raced = true;
        const tree = git(['--git-dir', remote, 'rev-parse', `${first.revision}^{tree}`]).trim();
        const competing = git(['--git-dir', remote, '-c', 'user.name=Test competitor', '-c', 'user.email=test@example.invalid', 'commit-tree', tree, '-p', first.revision, '-m', 'Competing verified update']).trim();
        git(['--git-dir', remote, 'update-ref', trendsPublishTarget.ref, competing, first.revision]);
      }
      return run(args, options);
    };
    const changedBundle = JSON.parse(stage.files['feed/google-trends/feed.json']);
    const changedRaw = JSON.parse(changedBundle.sources.neuralink.raw.replace(/^\)\]\}',?\r?\n/, ''));
    changedRaw.default.timelineData[1].value[0] = 42;
    changedRaw.default.timelineData[1].formattedValue[0] = '42';
    changedBundle.sources.neuralink.raw = JSON.stringify(changedRaw);
    const changedFiles = { ...stage.files, 'feed/google-trends/feed.json': JSON.stringify(changedBundle) };
    assert.throws(() => publishTrendsFeed(changedFiles, first.revision, racingRun), /stale|rejected|changed|lease/i);
    assert.equal(raced, true);
    assert.throws(() => publishTrendsFeed({ ...stage.files, 'src/app/page.tsx': 'bad' }, first.revision, run), /approved|paths/i);
    assert.throws(() => publishTrendsFeed(stage.files, 'main', run), /expected|revision/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('production Git runner overrides all synthetic ambient identities in the actual local commit', async () => {
  const { stageTrendsFeed, publishTrendsFeed, trendsPublishTarget } = await import('../scripts/lib/google-trends-feed-producer.ts');
  const dir = scratch(), remote = resolve(dir, 'production-remote.git');
  const overrides = {
    ...syntheticGitIdentity,
    // Rewrite only the fixed publisher URL to a disposable local bare remote.
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: `url.${remote}.insteadOf`,
    GIT_CONFIG_VALUE_0: trendsPublishTarget.repository,
  };
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  try {
    const init = spawnSync('git', ['init', '--bare', remote], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);
    Object.assign(process.env, overrides);
    const stage = stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, new Date('2026-10-15T23:00:00Z'));
    // No injected runner: exercise the real spawnSync environment construction.
    const result = publishTrendsFeed(stage.files, 'absent', undefined, new Date('2026-10-15T23:00:00Z'));
    assert.equal(result.verified, true);
    const metadata = spawnSync('git', ['--git-dir', remote, 'show', '--no-patch', commitMetadataFormat, result.revision], { encoding: 'utf8' });
    assert.equal(metadata.status, 0, metadata.stderr);
    assert.equal(metadata.stdout, expectedCommitMetadata);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const field of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'message', 'readback-error']) {
  test(`publisher refuses actual synthetic ${field} metadata before any push without echoing it`, async () => {
    const { stageTrendsFeed, publishTrendsFeed, trendsPublishTarget } = await import('../scripts/lib/google-trends-feed-producer.ts');
    const dir = scratch(), remote = resolve(dir, 'rejected-metadata.git');
    const marker = `SYNTHETIC_UNAPPROVED_${field}@example.invalid`;
    let actualMetadata, pushAttempted = false;
    const git = (args, { cwd, input, env } = {}) => {
      const result = spawnSync('git', args, { cwd, input, encoding: 'utf8', env: { ...process.env, ...syntheticGitIdentity, ...env } });
      if (result.status !== 0) throw new Error(result.stderr);
      return result.stdout;
    };
    const run = (args, options) => {
      const localArgs = args.map(arg => arg === trendsPublishTarget.repository ? remote : arg);
      if (args.includes('push')) pushAttempted = true;
      if (field === 'readback-error' && args.includes(commitMetadataFormat)) throw new Error(marker);
      if (args.includes('commit-tree')) {
        const changed = { ...options, env: { ...options.env } };
        if (field === 'message') localArgs[localArgs.indexOf('-m') + 1] = marker;
        else if (field !== 'readback-error') changed.env[field] = marker;
        const revision = git(localArgs, changed);
        actualMetadata = git(['--git-dir', args[1], 'show', '--no-patch', commitMetadataFormat, revision.trim()]);
        return revision;
      }
      return git(localArgs, options);
    };
    try {
      git(['init', '--bare', remote]);
      const stage = stageTrendsFeed('docs/google-trends/source', `${dir}/stage`, new Date('2026-10-15T23:00:00Z'));
      let failure;
      try { publishTrendsFeed(stage.files, 'absent', run, new Date('2026-10-15T23:00:00Z')); }
      catch (error) { failure = error; }
      assert.ok(failure, 'unapproved or unreadable real commit metadata must abort publication');
      assert.match(failure.message, /commit metadata.*verification/i);
      assert.equal(failure.message.includes(marker), false, 'failure output must not disclose unexpected metadata');
      assert.equal(pushAttempted, false);
      assert.equal(git(['ls-remote', '--refs', remote, trendsPublishTarget.ref]).trim(), '');
      if (field === 'readback-error') assert.equal(actualMetadata, expectedCommitMetadata);
      else assert.ok(actualMetadata.includes(marker), 'negative control must inspect a real changed Git commit');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test('rolling window is three calendar years, including leap-day clamping', async () => {
  const { rollingTrendsWindow } = await import('../scripts/lib/google-trends-feed-producer.ts');
  assert.deepEqual(rollingTrendsWindow(new Date('2026-10-30T14:00:00Z')), { start: '2023-10-30', end: '2026-10-30' });
  assert.deepEqual(rollingTrendsWindow(new Date('2028-02-29T12:00:00Z')), { start: '2025-02-28', end: '2028-02-29' });
});

test('CLI is dry-run by default and publish requires an explicit expected branch revision', () => {
  const dir = scratch();
  try {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/weekly-google-trends-feed.ts', '--publish'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected/i);
    const window = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/weekly-google-trends-feed.ts', '--window'], { encoding: 'utf8' });
    assert.equal(window.status, 0, window.stderr);
    assert.match(JSON.parse(window.stdout).end, /^\d{4}-\d{2}-\d{2}$/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('app config suppresses only the three approved data branches and leaves application deployments enabled', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.git.deploymentEnabled, { 'data/google-trends-feed': false, 'data/openalex-citation-latency-feed': false, 'data/openalex-publications-feed': false });
});
