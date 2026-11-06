import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLICATION_RUNTIME_PATHS} from '../scripts/weekly-publications-feed.ts';
test('reviewed runtime pins the exact baseline acquisition code as well as its consumers',()=>{
 assert.ok(PUBLICATION_RUNTIME_PATHS.includes('scripts/publications/acquire_baselines.py'));
});
