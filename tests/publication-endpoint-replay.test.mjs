import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parsePublicationSnapshot,PUBLICATION_SECTORS} from '../src/lib/publication-data.ts';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('bundled full endpoint observations match the anonymous real replay receipt and unchanged legacy bytes',()=>{
 const bytes=readFileSync('src/data/publications/publication-charts.snapshot.json');
 const snapshot=parsePublicationSnapshot(JSON.parse(bytes));
 assert.ok(snapshot.tables.nt_talent_endpoints,'real producer endpoint observations are not integrated');
 const receiptText=readFileSync('docs/publications/endpoint-replay-20261106.json','utf8');
 const receipt=JSON.parse(receiptText);
 assert.equal(snapshot.source.testOnly,false);
 assert.equal(hash(bytes),receipt.snapshotSha256);
 assert.equal(hash(readFileSync('scripts/publications/derive.py')),snapshot.source.methodSha256);
 assert.deepEqual(snapshot.tables.nt_talent_endpoints.rows,receipt.endpointRows);
 assert.deepEqual(snapshot.audit.affiliationEndpointCohort,receipt.affiliationEndpointCohort);
 assert.equal(receipt.independentAll16CellsIdentical,true);
 assert.equal(receipt.fullRawReceiptReplayVerified,true);
 assert.equal(receipt.rawReceiptCount,receipt.sourceProof.rawReceiptCount);
 assert.equal(snapshot.source.sourceHash,receipt.legacySourceHash);
 const original=structuredClone(snapshot);
 delete original.tables.nt_talent_endpoints;
 delete original.audit.affiliationEndpointCohort;
 original.source.methodSha256=receipt.legacyMethodSha256;
 assert.equal(hash(JSON.stringify(original,null,2)+'\n'),receipt.legacySnapshotSha256,
  'every original byte must survive after removing only the new outputs and restoring the original method hash');
 snapshot.tables.nt_talent_moves.rows.forEach((row,i)=>assert.equal(row[PUBLICATION_SECTORS.indexOf(row[0])+1],null,`legacy diagonal ${i}`));
 assert.doesNotMatch(receiptText,/https:\/\/openalex\.org\/[AWI][0-9]|author_ids|work_ids|authorNames|privatePath|api_key|Bearer /);
});
