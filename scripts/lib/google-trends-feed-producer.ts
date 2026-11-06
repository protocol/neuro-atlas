import { readFileSync, mkdirSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { trendsFingerprints, validateTrendsBundle } from '../../src/lib/field-velocity/google-trends-feed';
import { spawnSync } from 'node:child_process';
import { TRENDS_BRANCH, TRENDS_FEED_PATH, TRENDS_REVISION } from '../../src/lib/field-velocity/google-trends-reader';

export const DATA_BRANCH_VERCEL = JSON.stringify({ '$schema': 'https://openapi.vercel.sh/vercel.json', git: { deploymentEnabled: false } }, null, 2) + '\n';
export type StagedFeed = { files: Record<string, string>; start: string; end: string; fingerprints: Record<string, string>; published: false };

export function stageTrendsFeed(source: string, out: string, now = new Date()): StagedFeed {
  const today = now.toISOString().slice(0, 10);
  const sources = Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, {
    raw: readFileSync(`${source}/${id}.raw.json`, 'utf8'), request: readFileSync(`${source}/${id}.request.json`, 'utf8'),
  }]));
  const validated = validateTrendsBundle({ version: 1, sources });
  if (validated.snapshot.end !== today || validated.snapshot.groups.some(group => new Date(group.capturedAt).toISOString().slice(0, 10) !== today)) throw new Error('Capture must replace the full rolling 36-month window ending today');
  const destination = resolve(out);
  if (!destination.startsWith(resolve('.qa') + '/') || existsSync(destination)) throw new Error('Use a fresh staging directory under .qa; destination exists or is outside staging');
  const files = { [TRENDS_FEED_PATH]: JSON.stringify(validated.bundle, null, 2) + '\n', 'vercel.json': DATA_BRANCH_VERCEL };
  mkdirSync(destination, { recursive: true });
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(dirname(resolve(destination, path)), { recursive: true });
    writeFileSync(resolve(destination, path), bytes, { flag: 'wx' });
  }
  return { files, start: validated.snapshot.start, end: validated.snapshot.end, fingerprints: trendsFingerprints(validated), published: false };
}
export const trendsPublishTarget = { repository: 'https://github.com/protocol/neuro-atlas.git', ref: `refs/heads/${TRENDS_BRANCH}` } as const;

export type GitRunner = (args: string[], options: { cwd: string; input?: string; env?: Partial<NodeJS.ProcessEnv> }) => string;
const runGit: GitRunner = (args, options) => {
  const result = spawnSync('git', args, { ...options, encoding: 'utf8', timeout: 60_000, maxBuffer: 2_000_000, env: { ...process.env, ...options.env, GIT_TERMINAL_PROMPT: '0' } });
  if (result.status !== 0 || result.error) throw new Error(`Git feed operation failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
};

/** Explicit publish only. Exact target and exact expected ref; no code trees or automatic retry. */
export function publishTrendsFeed(files: Record<string, string>, expected: string, run: GitRunner = runGit, now = new Date()) {
  if (Object.keys(files).sort().join('\n') !== [TRENDS_FEED_PATH, 'vercel.json'].sort().join('\n') || files['vercel.json'] !== DATA_BRANCH_VERCEL) throw new Error('Only approved feed paths and deployment suppression are publishable');
  if (expected !== 'absent' && !TRENDS_REVISION.test(expected)) throw new Error('Explicit expected revision or absent is required');
  const next = validateTrendsBundle(JSON.parse(files[TRENDS_FEED_PATH]));
  const fingerprints = trendsFingerprints(next);
  let changedCharts = next.snapshot.groups.map(group => `google-trends-${group.id}`);
  if (next.snapshot.end !== now.toISOString().slice(0, 10) || next.snapshot.groups.some(g => new Date(g.capturedAt).toISOString().slice(0, 10) !== next.snapshot.end)) throw new Error('Publish capture/window must be current');
  const { repository, ref } = trendsPublishTarget;
  // Empty helper resets configured providers; gh's existing broker handles credentials natively.
  const auth = ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential'];
  const remoteHead = () => run([...auth, 'ls-remote', '--refs', repository, ref], { cwd: process.cwd() }).trim().split(/\s/)[0] || 'absent';
  if (remoteHead() !== expected) throw new Error('Data branch changed from expected revision; stop and inspect');
  mkdirSync('.qa', { recursive: true });
  const dir = mkdtempSync(resolve('.qa/feed-publish-'));
  const git = (args: string[], input?: string, env?: Partial<NodeJS.ProcessEnv>) => run(['--git-dir', dir, ...args], { cwd: process.cwd(), input, env });
  try {
    run(['init', '--bare', dir], { cwd: process.cwd() });
    if (expected !== 'absent') {
      git([...auth, 'fetch', '--no-tags', '--depth=1', repository, ref]);
      if (git(['rev-parse', 'FETCH_HEAD']).trim() !== expected) throw new Error('Data branch changed during fetch');
      const entries = git(['ls-tree', '-r', '-t', expected]).trim().split('\n');
      const shape = [
        /^040000 tree [a-f0-9]{40}\tfeed$/,
        /^040000 tree [a-f0-9]{40}\tfeed\/google-trends$/,
        /^100644 blob [a-f0-9]{40}\tfeed\/google-trends\/feed.json$/,
        /^100644 blob [a-f0-9]{40}\tvercel.json$/,
      ];
      if (entries.length !== shape.length || entries.some((entry, i) => !shape[i].test(entry)) || git(['show', `${expected}:vercel.json`]) !== DATA_BRANCH_VERCEL) throw new Error('Existing branch tree contains unapproved paths/modes or lacks deployment suppression');
      const previous = validateTrendsBundle(JSON.parse(git(['show', `${expected}:${TRENDS_FEED_PATH}`])));
      if (previous.snapshot.end > next.snapshot.end) throw new Error('Refusing to publish an older window');
      const previousFingerprints = trendsFingerprints(previous);
      changedCharts = next.snapshot.groups.filter(group => fingerprints[group.id] !== previousFingerprints[group.id]).map(group => `google-trends-${group.id}`);
      if (!changedCharts.length) {
        if (remoteHead() !== expected) throw new Error('Data branch changed during no-op verification; stop and inspect');
        return { revision: expected, ref, paths: Object.keys(files), verified: true, published: false, changedCharts, fingerprints };
      }
    }
    const blob = (content: string) => git(['hash-object', '-w', '--stdin'], content).trim();
    const feedBlob = blob(files[TRENDS_FEED_PATH]), configBlob = blob(files['vercel.json']);
    const leaf = git(['mktree'], `100644 blob ${feedBlob}\tfeed.json\n`).trim();
    const feedTree = git(['mktree'], `040000 tree ${leaf}\tgoogle-trends\n`).trim();
    const tree = git(['mktree'], `040000 tree ${feedTree}\tfeed\n100644 blob ${configBlob}\tvercel.json\n`).trim();
    const name = 'Neuro Atlas data refresh', email = 'neuro-atlas-data@users.noreply.github.com';
    const message = `Google Trends full window ${next.snapshot.start}–${next.snapshot.end}`;
    // Git's author/committer environment overrides -c user.* configuration.
    const revision = git(['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit-tree', tree, ...(expected === 'absent' ? [] : ['-p', expected]), '-m', message], undefined, {
      GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email,
    }).trim();
    // Inspect the actual object, not just commit arguments. Never echo unexpected
    // private metadata (including a failed inspection's output) into operator logs.
    try {
      const metadata = TRENDS_REVISION.test(revision) && git(['show', '--no-patch', '--format=format:%an%x00%ae%x00%cn%x00%ce%x00%B', revision]);
      if (metadata !== [name, email, name, email, `${message}\n`].join('\0')) throw new Error('Unapproved commit metadata');
    } catch {
      throw new Error('Created data commit metadata failed public identity/message verification');
    }
    git([...auth, 'push', `--force-with-lease=${ref}:${expected === 'absent' ? '' : expected}`, repository, `${revision}:${ref}`]);
    if (remoteHead() !== revision) throw new Error('Published ref readback changed; do not retry automatically');
    git([...auth, 'fetch', '--no-tags', '--depth=1', repository, ref]);
    if (git(['rev-parse', 'FETCH_HEAD']).trim() !== revision) throw new Error('Published fetch readback changed');
    for (const [path, bytes] of Object.entries(files)) if (git(['show', `FETCH_HEAD:${path}`]) !== bytes) throw new Error('Published source bytes differ');
    return { revision, ref, paths: Object.keys(files), verified: true, published: true, changedCharts, fingerprints };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

export function rollingTrendsWindow(now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const year = now.getUTCFullYear() - 3, month = now.getUTCMonth();
  const day = Math.min(now.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return { start: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10), end };
}
