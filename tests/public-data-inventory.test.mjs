import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const script='scripts/research/audit-malecns-image-size.py';
const run=(...args)=>spawnSync('python3',[script,...args],{encoding:'utf8'});
test('stored-object snapshot reproduces the measured integer-byte total',()=>{
 const r=run('--snapshot','docs/data/public-data-size/malecns-20261103.jsonl.gz');
 assert.equal(r.status,0,r.stderr);const actual=JSON.parse(r.stdout);
 assert.equal(actual.objects,27595);assert.equal(actual.bytes,50910260068834);assert.equal(actual.PB,0.050910260068834);
 assert.equal(actual.levels['8x8x8'],44428865656516);
});
for(const [kind,items,error] of [
 ['duplicate',[{name:'em/em-clahe-jpeg/8x8x8/0.shard',size:'1'},{name:'em/em-clahe-jpeg/8x8x8/0.shard',size:'1'}],'duplicate'],
 ['outside scope',[{name:'v1.0/segmentation/0.shard',size:'2'}],'scope'],
 ['negative bytes',[{name:'em/em-clahe-jpeg/8x8x8/0.shard',size:'-1'}],'size'],
]) test(`stored-object inventory rejects ${kind}`,()=>{
 const dir=mkdtempSync('/opt/data/tmp/malecns-regression-');
 try {const path=dir+'/bad.jsonl.gz';writeFileSync(path,gzipSync(items.map(x=>JSON.stringify(x)).join('\n')));const r=run('--snapshot',path);assert.notEqual(r.status,0);assert.match(r.stderr,new RegExp(error));}
 finally{rmSync(dir,{recursive:true,force:true});}
});

import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
test('historical snapshot discloses the sole size-only metadata row without inventing its provenance',()=>{
 const manifest=JSON.parse(readFileSync('docs/data/public-data-size/malecns-20261103.json','utf8'));
 const rows=gunzipSync(readFileSync('docs/data/public-data-size/malecns-20261103.jsonl.gz')).toString().trim().split('\n').map(l=>JSON.parse(l));
 const missing=rows.filter(r=>!r.generation||!r.updated);assert.deepEqual(missing,[{name:'em/em-clahe-jpeg/info',size:'633'}]);
 assert.equal(manifest.provenance.imageRecordsWithGenerationAndUpdated,27594);
 assert.match(manifest.provenance.metadataRow,/size only/);
});
