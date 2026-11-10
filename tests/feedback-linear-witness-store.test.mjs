import test from 'node:test';
import assert from 'node:assert/strict';
import {store,record,operation,scope} from './feedback-linear-witness-fixture.test.mjs';

test('independent store requires explicit initialization; reserve is blocking until exact commit; deleted unseen tail never accepts old prefix',async t=>{
 const {w,root,FileIntakeWitness}=await store(t);
 await assert.rejects(w.assertAvailable());await w.initialize();await w.assertAvailable();
 const a=record(),b=record(a.feedbackId,2,a);
 await assert.rejects(w.assertLatest([a]));
 await w.reserve(operation(a));await assert.rejects(w.assertLatest([a]));
 await w.complete(operation(a));await w.assertLatest([a]);
 await w.reserve(operation(b));await assert.rejects(w.assertLatest([a]));
 await w.complete(operation(b));
 const restarted=new FileIntakeWitness({root,scope});
 await assert.rejects(restarted.assertLatest([a]));await restarted.assertLatest([a,b]);
});

test('a witness read holds the same exclusive filesystem lock as writes, not a racy directory snapshot',async t=>{
 const fs=(await import('node:fs/promises')).default,{syncBuiltinESMExports}=await import('node:module');
 const {w,root,FileIntakeWitness}=await store(t);await w.initialize();const a=record(),b=record(a.feedbackId,2,a);await w.reserve(operation(a));await w.complete(operation(a));
 const other=new FileIntakeWitness({root,scope}),original=fs.readdir;let attempted=false,writeSucceeded;
 fs.readdir=async(...args)=>{const result=await original(...args);if(!attempted&&args[0]===root){attempted=true;try{await other.reserve(operation(b));writeSucceeded=true;}catch{writeSucceeded=false;}}return result;};syncBuiltinESMExports();
 try{await w.assertLatest([a]);assert.equal(attempted,true);assert.equal(writeSucceeded,false,'writer cannot slip between read snapshot and comparison');}finally{fs.readdir=original;syncBuiltinESMExports();}
});

test('a failed post-rename directory fsync retains an orphan stop lock instead of accepting uncertain durability',async t=>{
 const fs=(await import('node:fs/promises')).default,{syncBuiltinESMExports}=await import('node:module');
 const {w,root}=await store(t);await w.initialize();const original=fs.open;let rootSyncs=0;
 fs.open=async(...args)=>{const h=await original(...args);if(args[0]===root){const sync=h.sync.bind(h);h.sync=async()=>{rootSyncs++;if(rootSyncs===2)throw Object.assign(new Error('synthetic fsync fault'),{code:'EIO'});return sync();};}return h;};syncBuiltinESMExports();
 try{await assert.rejects(w.reserve(operation(record())));}finally{fs.open=original;syncBuiltinESMExports();}
 await assert.rejects(w.assertAvailable(),'uncertain fsync must require explicit operator recovery');
});

test('explicit initialization rejects ancestor symlinks before creating anything through them',async t=>{
 const {w,root,FileIntakeWitness}=await store(t),fs=await import('node:fs/promises');
 await fs.mkdir(root+'/real',{mode:0o700});await fs.symlink(root+'/real',root+'/link');
 const unsafe=new FileIntakeWitness({root:root+'/link/new-store',scope});await assert.rejects(unsafe.initialize());
 await assert.rejects(fs.lstat(root+'/real/new-store'),e=>e.code==='ENOENT');
 await fs.unlink(root+'/link');await fs.rm(root+'/real',{recursive:true});await w.initialize();
});

test('independent OS processes arbitrate reserve CAS and retain immutable identities across restart',async t=>{
 const {w,root}=await store(t);await w.initialize();const {spawn}=await import('node:child_process'),a=operation(record()),b={...a,requestHash:'b'.repeat(64),recordHash:'c'.repeat(64)};
 const run=op=>new Promise((resolve,reject)=>{const code=`import {FileIntakeWitness} from './scripts/feedback-linear/witness-store.ts';const w=new FileIntakeWitness(${JSON.stringify({root,scope})});for(let i=0;i<100;i++){try{await w.reserve(${JSON.stringify(op)});console.log('reserved');break;}catch(e){if(e.message==='witness_locked'){await new Promise(r=>setTimeout(r,2));continue;}console.log(e.message);break;}}`;
  const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:process.cwd(),env:{PATH:process.env.PATH}});let out='',err='';const timer=setTimeout(()=>child.kill('SIGKILL'),15000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('exit',status=>{clearTimeout(timer);if(status===0)resolve(out.trim());else reject(new Error(err||'child_failed'));});});
 const outcomes=await Promise.all([run(a),run(b)]);assert.deepEqual(outcomes.sort(),['reserved','witness_conflict']);
 const rows=await w.read(a.feedbackId);assert.equal(rows.length,1);assert.equal(rows[0].state,'reserved');await assert.rejects(w.assertLatest([record()]));
});

test('private permissions, symlink files, orphan locks, partial artifacts, corrupted journal and scope mismatch fail closed',async t=>{
 const fs=await import('node:fs/promises');
 for(const fault of ['root-permissions','file-permissions','file-symlink','hardlink','lock','partial','corrupt','gap','scope']){
  const {w,root,FileIntakeWitness}=await store(t);await w.initialize();await w.reserve(operation(record()));
  if(fault==='root-permissions')await fs.chmod(root,0o750);
  if(fault==='file-permissions')await fs.chmod(root+'/scope.json',0o640);
  if(fault==='file-symlink'){const target=root+'-scope';await fs.rename(root+'/scope.json',target);t.after(()=>fs.rm(target,{force:true}));await fs.symlink(target,root+'/scope.json');}
  if(fault==='hardlink'){const target=root+'-link';await fs.link(root+'/scope.json',target);t.after(()=>fs.rm(target,{force:true}));}
  if(fault==='lock')await fs.mkdir(root+'/.lock',{mode:0o700});
  if(fault==='partial')await fs.writeFile(root+'/.tmp-interrupted','partial',{mode:0o600});
  if(fault==='corrupt')await fs.writeFile(root+'/00000001.json','{}',{mode:0o600});
  if(fault==='gap')await fs.rename(root+'/00000001.json',root+'/00000002.json');
  const checked=fault==='scope'?new FileIntakeWitness({root,scope:{...scope,teamId:scope.ownerId}}):w;
  await assert.rejects(checked.assertAvailable(),fault);
 }
});
