import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('standard private-worker verification bounds parallel test files without omitting the suite',async()=>{
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(pkg.scripts.test,/--test-concurrency=4\b/);
  assert.match(pkg.scripts.test,/tests\/\*\.test\.mjs$/);
});
