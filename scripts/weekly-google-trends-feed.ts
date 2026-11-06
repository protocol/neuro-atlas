import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { stageTrendsFeed, publishTrendsFeed, rollingTrendsWindow, trendsPublishTarget } from './lib/google-trends-feed-producer';
import { TRENDS_REVISION } from '../src/lib/field-velocity/google-trends-reader';

const { values } = parseArgs({ options: {
  source: { type: 'string' }, out: { type: 'string' },
  publish: { type: 'boolean', default: false }, expected: { type: 'string' }, window: { type: 'boolean', default: false },
} });
if (values.publish && (!values.expected || (values.expected !== 'absent' && !TRENDS_REVISION.test(values.expected)))) throw new Error('--publish requires --expected <exact branch SHA | absent>');
if (values.window) {
  if (values.publish || values.source || values.out || values.expected) throw new Error('--window is a read-only standalone operation');
  console.log(JSON.stringify(rollingTrendsWindow()));
} else {
  if (!values.source || !values.out) throw new Error('Required: --source <fresh capture directory> --out <fresh .qa stage directory>; default is dry-run');
  const stage = stageTrendsFeed(values.source, values.out);
  const receipt = values.publish ? publishTrendsFeed(stage.files, values.expected!) : { published: false, mode: 'dry-run' };
  console.log(JSON.stringify({ ...receipt, target: trendsPublishTarget, start: stage.start, end: stage.end, fingerprints: stage.fingerprints, files: Object.entries(stage.files).map(([path, bytes]) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes) })) }, null, 2));
}
