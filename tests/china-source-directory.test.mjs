import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scanSources } from './helpers/methodology-source-inventory.mjs';
test('China backfill and the retained PR source credit leave no source-directory gaps or unmatched entries',()=>{
 const { included }=scanSources();
 const directory=new Set(Object.values(JSON.parse(readFileSync(new URL('../src/data/methodology-sources.json',import.meta.url)))).flat().map(([url])=>url));
 const missing=[...included.keys()].filter(url=>!directory.has(url)).sort();
 const extra=[...directory].filter(url=>!included.has(url)).sort();
 assert.deepEqual(missing,[],'Every included source is classified, including the retained PMC1564115 credit');
 assert.deepEqual(extra,[],'No noncanonical or unmatched source-directory entries');
});
