import test from 'node:test';
import assert from 'node:assert/strict';
import * as paths from '../src/lib/atlas-path.ts';
import { readFileSync } from 'node:fs';

test('desktop and mobile use the same narrowly scoped active-section predicate for graph pages',()=>{
  assert.equal(typeof paths.atlasSectionActive,'function');
  for(const path of ['/field-velocity','/field-velocity/citation-latency'])assert.equal(paths.atlasSectionActive(path,'/field-velocity'),true);
  for(const path of ['/field-velocity3','/field-velocity-private','/funding','/'])assert.equal(paths.atlasSectionActive(path,'/field-velocity'),false);
  assert.equal(paths.atlasSectionActive('/funding','/funding'),true);
  assert.equal(paths.atlasSectionActive('/milestones','/milestones'),true);
  assert.equal(paths.atlasSectionActive('/funding/unrelated','/funding'),false);
  const source=readFileSync(new URL('../src/components/site-nav.tsx',import.meta.url),'utf8');
  assert.match(source,/atlasSectionActive\(pathname, t.href\)/);
  assert.match(source,/atlasSectionActive\(pathname, tab.href\)/);
});
