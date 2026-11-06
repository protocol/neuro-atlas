import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Explicitly synthetic browser responses; no browser, Google or Git writes.
const driver = String.raw`
import json, os
from pathlib import Path
root = Path.cwd()
responses = []
for ident in ['neurotech', 'neuralink']:
    metadata = json.loads((root / ('docs/google-trends/source/' + ident + '.request.json')).read_text())
    request = metadata['widgetRequest']
    if os.environ.get('CAPTURE_TEST_UNSAFE') == '1' and ident == 'neurotech':
        request['apiKey'] = 'EXPLICIT_SYNTHETIC_PRIVACY_MARKER'
    responses.append({'status': 200, 'body': json.dumps({'widgets': [{'id': 'TIMESERIES', 'request': request, 'token': 'EXPLICIT_SYNTHETIC_WIDGET_TOKEN'}]})})
    responses.append({'status': 200, 'body': (root / ('docs/google-trends/source/' + ident + '.raw.json')).read_text()})
def js(expression, **kwargs):
    if expression.startswith('location.origin'):
        return True
    return responses.pop(0)
def goto_url(url):
    pass
def wait_for_load():
    pass
exec(compile((root / 'scripts/capture-google-trends.py').read_text(), 'scripts/capture-google-trends.py', 'exec'), globals())
`;

test('synthetic unapproved acquisition metadata is rejected before any capture file is persisted', () => {
  mkdirSync('.qa', { recursive: true });
  const base = mkdtempSync(resolve('.qa/capture-privacy-test-'));
  try {
    for (const unsafe of [false, true]) {
      const out = join(base, unsafe ? 'unsafe' : 'accepted');
      const result = spawnSync('python3', ['-c', driver], { encoding: 'utf8', timeout: 30_000, env: {
        ...process.env,
        TRENDS_CAPTURE_START: '2023-10-15', TRENDS_CAPTURE_END: '2026-10-15', TRENDS_CAPTURE_OUT: out,
        CAPTURE_TEST_UNSAFE: unsafe ? '1' : '0',
      } });
      assert.doesNotMatch(result.stdout + result.stderr, /EXPLICIT_SYNTHETIC_PRIVACY_MARKER|EXPLICIT_SYNTHETIC_WIDGET_TOKEN/, 'Capture diagnostics must not echo unknown values or widget tokens');
      if (unsafe) {
        assert.notEqual(result.status, 0, 'Unknown capture metadata must fail closed before disk writes');
        assert.equal(existsSync(out), false, 'Unapproved capture must create no destination directory');
      } else {
        assert.equal(result.status, 0, result.stderr);
        for (const id of ['neurotech', 'neuralink']) {
          assert.equal(readFileSync(join(out, id + '.raw.json'), 'utf8'), readFileSync('docs/google-trends/source/' + id + '.raw.json', 'utf8'));
          const meta = readFileSync(join(out, id + '.request.json'), 'utf8');
          assert.doesNotMatch(meta, /EXPLICIT_SYNTHETIC_WIDGET_TOKEN/);
          assert.deepEqual(JSON.parse(meta).widgetRequest, JSON.parse(readFileSync('docs/google-trends/source/' + id + '.request.json', 'utf8')).widgetRequest);
        }
      }
    }
  } finally { rmSync(base, { recursive: true, force: true }); }
});
