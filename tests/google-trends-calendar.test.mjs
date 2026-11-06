import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('parser accepts a calendar-clamped leap-day 36-month window without losing weekly coverage', async () => {
  const { parseGoogleTrends } = await import('../src/lib/field-velocity/google-trends.ts');
  const start = '2021-02-28', end = '2024-02-29';
  const timelineData = [];
  for (let t = Date.parse(start); t <= Date.parse(end); t += 7 * 86400000) timelineData.push({ time: String(t / 1000), value: [3], formattedValue: ['3'], hasData: [true] });
  assert.ok(parseGoogleTrends(JSON.stringify({ default: { timelineData } }), { terms: ['Neuralink'], start, end, capturedAt: '2024-03-01T12:00:00Z' }).rows.length > 150);
});

test('browser acquisition preflight accepts the same valid leap-day calendar window', () => {
  const result = spawnSync('python3', ['-c', "exec(open('scripts/capture-google-trends.py').read().split('goto_url(')[0]); print('valid')"], { encoding: 'utf8', env: { ...process.env, TRENDS_CAPTURE_START: '2021-02-28', TRENDS_CAPTURE_END: '2024-02-29', TRENDS_CAPTURE_OUT: '.qa/calendar-preflight-no-write' } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid/);
});
