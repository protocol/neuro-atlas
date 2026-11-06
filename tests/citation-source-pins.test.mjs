import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const blob=path=>{const bytes=readFileSync(path);return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');};
test('upstream generator and direction implementation remain exact pinned Git blobs',()=>{
 assert.equal(blob('scripts/vendor/field_velocity_openalex.py'),'87a4e15fa4f957ca980a056d949b72cfc353b615');
 assert.equal(blob('scripts/vendor/vintage-direction.mjs'),'a63c91f2a196f8a542e9341f30eefcaeefe2ccec');
});
test('original shared snapshot and provenance retain initial-main byte hashes',()=>{
 const hashes={
  'src/data/field-velocity/neurotech.snapshot.json':'2b16a8ebf5ada867a79129243fc3f3afada7ad6e75a639ca0d005849607815ee',
  'src/data/field-velocity/neurotech.snapshot.json.provenance.json':'66df3d351fd6318ed289b1d0e8299ad8da9a7f6399becda046d17baf49f48b97',
 };
 for(const [path,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash);
});
