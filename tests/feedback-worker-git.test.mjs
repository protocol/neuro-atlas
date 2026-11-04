import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sha256 } from '../scripts/feedback/validator.ts';
const file='src/components/landing.css';
const git=(cwd,...args)=>execFileSync('/usr/bin/git',args,{cwd,encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
export async function fixture(t) {
  const cwd=await mkdtemp(path.join(tmpdir(),'atlas-feedback-'));
  t.after(()=>rm(cwd,{recursive:true,force:true}));
  await mkdir(path.join(cwd,'src/components'),{recursive:true});
  await writeFile(path.join(cwd,file),'.card { gap: 8px; }\n');
  await writeFile(path.join(cwd,'src/proxy.ts'),'PRIVATE_CANARY_DO_NOT_EXPORT');
  git(cwd,'init','-q'); git(cwd,'config','user.email','synthetic@example.invalid'); git(cwd,'config','user.name','Synthetic'); git(cwd,'add','.'); git(cwd,'commit','-qm','fixture');
  return {cwd,base:git(cwd,'rev-parse','HEAD')};
}
test('real git checkout snapshot excludes private source, applies only verified patch and rejects dirty/stale/mode trees',async t=>{
  const { loadSnapshot, applyValidatedPatch }=await import('../scripts/feedback/git-sandbox.ts');
  const {cwd,base}=await fixture(t);
  const sources=await loadSnapshot(cwd,base);
  assert.deepEqual(Object.keys(sources),[file]);
  assert.ok(!JSON.stringify(sources).includes('PRIVATE_CANARY'));
  const patch={baseSha:base,files:[{path:file,beforeSha256:sha256(sources[file]),content:'.card { gap: 12px; }\n'}]};
  await applyValidatedPatch(cwd,patch,base);
  assert.equal(await readFile(path.join(cwd,file),'utf8'),patch.files[0].content);
  await assert.rejects(loadSnapshot(cwd,base),/needs_human_review/);
  git(cwd,'reset','--hard','HEAD');
  await assert.rejects(loadSnapshot(cwd,'b'.repeat(40)),/needs_human_review/);
  await rm(path.join(cwd,file)); await symlink('../proxy.ts',path.join(cwd,file));
  git(cwd,'add','.');git(cwd,'commit','-qm','malicious fixture symlink');
  await assert.rejects(loadSnapshot(cwd,git(cwd,'rev-parse','HEAD')),/needs_human_review/);
});
