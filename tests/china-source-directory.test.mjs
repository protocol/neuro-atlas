import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scanSources } from './helpers/methodology-source-inventory.mjs';
test('China backfill introduces no source-directory omissions or unmatched entries beyond the exact existing baseline gap',()=>{
 const { included }=scanSources();
 const directory=new Set(Object.values(JSON.parse(readFileSync(new URL('../src/data/methodology-sources.json',import.meta.url)))).flat().map(([url])=>url));
 const missing=[...included.keys()].filter(url=>!directory.has(url)).sort();
 const extra=[...directory].filter(url=>!included.has(url)).sort();
 assert.deepEqual(missing,['https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/'],'No new missing sources; the pre-existing unrelated PMC gap remains explicit');
 assert.deepEqual(extra,[],'No noncanonical or unmatched source-directory entries');
});
