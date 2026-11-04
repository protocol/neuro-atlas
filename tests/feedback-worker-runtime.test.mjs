import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {fixture} from './feedback-worker-git.test.mjs';
test('private runtime roles are disabled by default without opening DB, provider or token',async()=>{
  const { drainWorker,drainPublisher }=await import('../scripts/feedback/runtime.ts');
  let calls=0;const explode=async()=>{calls++;throw new Error('must not run')};
  assert.deepEqual(await drainWorker({enabled:false,next:explode,maxJobs:1}),[]);
  assert.deepEqual(await drainPublisher({enabled:false,next:explode,maxJobs:1}),[]);assert.equal(calls,0);
  const out=execFileSync(process.execPath,['--import','tsx','scripts/feedback/runtime.ts','worker'],{env:{PATH:process.env.PATH},encoding:'utf8'});assert.match(out,/disabled/);
});
test('bounded private drain actually runs queued work and stops on idle',async()=>{
  const { drainWorker }=await import('../scripts/feedback/runtime.ts');let calls=0;
  const rows=await drainWorker({enabled:true,maxJobs:3,next:async()=>({state:++calls===1?'publishing':'idle'})});assert.equal(calls,2);assert.deepEqual(rows,[{state:'publishing'},{state:'idle'}]);
});


test('runtime materializes isolated physical trusted dependencies instead of an escaping Turbopack symlink',async t=>{
  const {withCheckout}=await import('../scripts/feedback/runtime.ts');
  const {mkdir,writeFile,readFile,lstat,symlink,readlink}=await import('node:fs/promises');
  const path=await import('node:path');const f=await fixture(t);
  await writeFile(path.join(f.cwd,'.gitignore'),'node_modules/\n');
  execFileSync('/usr/bin/git',['add','.gitignore'],{cwd:f.cwd});execFileSync('/usr/bin/git',['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','-qm','ignore trusted dependencies'],{cwd:f.cwd});
  const base=execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:f.cwd,encoding:'utf8'}).trim();
  await mkdir(path.join(f.cwd,'node_modules/.bin'),{recursive:true});await mkdir(path.join(f.cwd,'node_modules/package'),{recursive:true});
  await writeFile(path.join(f.cwd,'node_modules/package/index.js'),'trusted-source');await symlink('../package/index.js',path.join(f.cwd,'node_modules/.bin/tool'));
  let disposable;
  await withCheckout(f.cwd,base,true,async cwd=>{
    disposable=cwd;
    assert.equal((await lstat(path.join(cwd,'node_modules'))).isSymbolicLink(),false);
    assert.equal(await readlink(path.join(cwd,'node_modules/.bin/tool')),'../package/index.js');
    await writeFile(path.join(cwd,'node_modules/package/index.js'),'candidate-local');
    assert.equal(await readFile(path.join(f.cwd,'node_modules/package/index.js'),'utf8'),'trusted-source');
  });
  await assert.rejects(lstat(disposable),e=>e.code==='ENOENT');
});
