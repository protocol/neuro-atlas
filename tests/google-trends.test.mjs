import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const raw = readFileSync('docs/google-trends/source/neurotech.raw.json', 'utf8');
const options = { terms: ['neurotechnology', 'brain-computer interface'], start: '2023-10-15', end: '2026-10-15', capturedAt: '2026-10-15T18:59:03.096730+00:00' };
const sourceRows = () => JSON.parse(raw.slice(raw.indexOf('{'))).default.timelineData;

test('rejects invalid, missing, out-of-range or misaligned source values instead of plotting them', async () => {
  const { parseGoogleTrends } = await import('../src/lib/field-velocity/google-trends.ts');
  for (const change of [r => r.value.pop(), r => r.value[0] = 101, r => r.value[0] = -1, r => r.value[0] = '7', r => r.hasData = [], r => r.formattedValue[0] = 'wrong', r => r.isPartial = 'false']) {
    const rows = sourceRows(); change(rows[0]);
    assert.throws(() => parseGoogleTrends(JSON.stringify({ default: { timelineData: rows } }), options), /Invalid Google Trends/);
  }
  for (const body of ['<html>Rate limited</html>', '{}', '{"default":{"timelineData":[]}}']) {
    assert.throws(() => parseGoogleTrends(body, options));
  }
});

test('validates the exact 36-month UTC window and weekly order, derives partial status even if Google omits it', async () => {
  const { parseGoogleTrends } = await import('../src/lib/field-velocity/google-trends.ts');
  const from = rows => JSON.stringify({ default: { timelineData: rows } });
  for (const change of [r => r[1].time = r[0].time, r => r.reverse(), r => r[0].time = 'bad', r => r[0].time = String(Number(r[0].time) + 1), r => r.pop(), r => r.shift(), r => r[0].isPartial = true]) {
    const rows = sourceRows(); change(rows);
    assert.throws(() => parseGoogleTrends(from(rows), options), /Invalid Google Trends/);
  }
  for (const patch of [{ start: '2025-10-15' }, { start: '2023-02-30' }, { end: '2023-10-14' }, { capturedAt: 'invalid' }, { capturedAt: '2026-10-14T00:00:00Z' }, { terms: [] }]) {
    assert.throws(() => parseGoogleTrends(raw, { ...options, ...patch }), /Invalid Google Trends/);
  }
  const rows = sourceRows(); delete rows.at(-1).isPartial;
  assert.equal(parseGoogleTrends(from(rows), options).rows.at(-1).partial, true);
});

test('preserves low-volume <1 and treats unavailable hasData=false as a gap, not zero', async () => {
  const { parseGoogleTrends } = await import('../src/lib/field-velocity/google-trends.ts');
  const rows = sourceRows(); rows[0].value = [0, 0]; rows[0].formattedValue = ['<1', '0']; rows[0].hasData = [true, false];
  const data = parseGoogleTrends(JSON.stringify({ default: { timelineData: rows } }), options);
  assert.deepEqual(data.rows[0].values, [0, null]);
  assert.deepEqual(data.rows[0].displayValues, ['<1', 'Unavailable']);
});

test('parses actual 36-month Google response without rescaling and separates incomplete week', async () => {
  assert.ok(existsSync('src/lib/field-velocity/google-trends.ts'), 'Google Trends parser is missing');
  const { parseGoogleTrends } = await import('../src/lib/field-velocity/google-trends.ts');
  const data = parseGoogleTrends(raw, options);
  assert.equal(data.rows.length, 157);
  assert.equal(data.rows.filter(r => !r.partial).length, 156);
  assert.deepEqual(data.rows[0], { date: '2023-10-15', values: [4, 2], displayValues: ['4', '2'], partial: false });
  assert.deepEqual(data.rows.at(-1), { date: '2026-10-11', values: [6, 3], displayValues: ['6', '3'], partial: true });
  assert.deepEqual(data.rows.at(-2).values, [7, 3]);
  assert.deepEqual(data.rows.map(r => r.values), sourceRows().map(r => r.value.map((v, i) => r.hasData[i] ? v : null)));
});
