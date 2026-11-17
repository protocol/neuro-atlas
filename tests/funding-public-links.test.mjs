import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCsv} from '../scripts/lib/funding-index.mjs';

test('Echo company website uses its current primary site rather than the nonresolving legacy domain', async()=>{
  const canonical=parseCsv(await readFile(new URL('../data/funding-index/companies.csv',import.meta.url),'utf8'));
  const generated=JSON.parse(await readFile(new URL('../src/data/funding-index.json',import.meta.url),'utf8'));
  assert.equal(canonical.find(c=>c.slug==='echo-neurotech').website,'https://www.echo.bio/');
  assert.equal(generated.companies.find(c=>c.slug==='echo-neurotech').website,'https://www.echo.bio/');
});

test('Merge company website uses the current official domain, not the TLS-invalid legacy domain', async()=>{
  const canonical=parseCsv(await readFile(new URL('../data/funding-index/companies.csv',import.meta.url),'utf8'));
  const generated=JSON.parse(await readFile(new URL('../src/data/funding-index.json',import.meta.url),'utf8'));
  assert.equal(canonical.find(c=>c.slug==='merge-labs').website,'https://merge.io/');
  assert.equal(generated.companies.find(c=>c.slug==='merge-labs').website,'https://merge.io/');
});
