import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export function capturedSources() {
  return Object.fromEntries(['neurotech', 'neuralink'].map(id => [id, {
    raw: readFileSync(`docs/google-trends/source/${id}.raw.json`, 'utf8'),
    request: readFileSync(`docs/google-trends/source/${id}.request.json`, 'utf8'),
  }]));
}

test('one validated source bundle regenerates both normalized groups and exact existing downloads', async () => {
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  const result = validateTrendsBundle({ version: 1, sources: capturedSources() });
  for (const name of ['google-trends.json', 'neurotech.csv', 'neuralink.csv']) {
    assert.equal(result.files[name], readFileSync(`public/data/google-trends/${name}`, 'utf8'));
  }
  assert.equal(result.snapshot.groups.length, 2);
  // Accepted captures are preserved, never sanitized by stripping/re-serializing metadata.
  assert.deepEqual(result.bundle.sources, capturedSources());
});

// Explicitly synthetic privacy markers: these must never reach a publishable bundle.
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
    test(`metadata allowlist rejects synthetic ${field} at ${path.join('.') || 'root'} in either source`, async () => {
      const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
      for (const id of ['neurotech', 'neuralink']) {
        const bad = changeSource((raw, request) => {
          const object = path.reduce((value, key) => value[key], request);
          object[field] = `SYNTHETIC_PRIVACY_TEST_ONLY_${field}`;
        }, id);
        assert.throws(() => validateTrendsBundle(bad), undefined, `${id}: ${path.join('.')}.${field}`);
      }
    });
  }
}

for (const [path, value] of [
  [['widgetRequest', 'requestOptions', 'backend'], 'SYNTHETIC_UNAPPROVED_BACKEND'],
  [['widgetRequest', 'userConfig', 'userType'], 'SYNTHETIC_UNAPPROVED_USER_TYPE'],
]) {
  test(`metadata allowlist rejects unapproved ${path.join('.')} values`, async () => {
    const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
    const bad = changeSource((raw, request) => {
      const object = path.slice(0, -1).reduce((value, key) => value[key], request);
      object[path.at(-1)] = value;
    });
    assert.throws(() => validateTrendsBundle(bad));
  });
}

function changeSource(change, id = 'neuralink') {
  const sources = capturedSources();
  const raw = JSON.parse(sources[id].raw.replace(/^\)\]\}',?\r?\n/, ''));
  const request = JSON.parse(sources[id].request);
  change(raw, request);
  sources[id] = { raw: JSON.stringify(raw), request: JSON.stringify(request) };
  return { version: 1, sources };
}

test('bundle rejects future capture dates rather than presenting future-dated observations as current', async () => {
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  assert.throws(() => validateTrendsBundle(changeSource((raw, request) => { request.capturedAt = '2099-10-15T20:00:00Z'; })));
});


test('source metadata containing credential/header fields is not eligible for public feed publication', async () => {
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  assert.throws(() => validateTrendsBundle(changeSource((raw, request) => { request.widgetRequest.token = 'not-a-real-token'; })));
});


test('request periods must be exactly two calendar dates, never an ignored suffix', async () => {
  const { validateTrendsBundle } = await import('../src/lib/field-velocity/google-trends-feed.ts');
  const bad = changeSource((raw, request) => {
    request.widgetRequest.time += ' ignored';
    request.exploreRequest.comparisonItem.forEach(item => { item.time = request.widgetRequest.time; });
  });
  assert.throws(() => validateTrendsBundle(bad));
});
