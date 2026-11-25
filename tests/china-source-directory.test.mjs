import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scanSources, canonicalSource } from './helpers/methodology-source-inventory.mjs';

test('financing participant quotations retain their real citations without promoting embedded organization links to evidence sources', () => {
 const { included, excluded } = scanSources();
 const evidence = JSON.parse(readFileSync(new URL('../data/funding-index/investor-evidence.json', import.meta.url)));
 for (const row of evidence) assert.ok(included.has(canonicalSource(row.sourceUrl)), row.sourceUrl + ': actual participant citation remains inventoried');
 for (const url of ['https://future.ventures/', 'https://jumpspace.vc/', 'https://www.khoslaventures.com/team/shernaz-daver/']) {
  assert.equal(included.has(url), false, url + ': an embedded quotation link is not an additional evidence source');
  assert.ok(excluded.get(url)?.every(row => row.reason === 'organization hyperlink inside a participant-source quotation'), url);
 }
});
test('China backfill introduces no source-directory omissions or unmatched entries beyond the exact existing baseline gap',()=>{
 const { included }=scanSources();
 const directory=new Set(Object.values(JSON.parse(readFileSync(new URL('../src/data/methodology-sources.json',import.meta.url)))).flat().map(([url])=>url));
 const missing=[...included.keys()].filter(url=>!directory.has(url)).sort();
 const extra=[...directory].filter(url=>!included.has(url)).sort();
 assert.deepEqual(missing,['https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/'],'No new missing sources; the pre-existing unrelated PMC gap remains explicit');
 assert.deepEqual(extra,[],'No noncanonical or unmatched source-directory entries');
});
