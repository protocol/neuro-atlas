import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const path = resolve('scripts/weekly-publications-feed.ts');

// Synthetic anonymous test seam only. Never accepted by the production parser/CLI.
const fixture = () => ({schemaVersion:2,source:{url:'https://api.openalex.org',testOnly:true,
 capturedAt:'2026-11-06T12:00:00Z',paperAsOf:'2026-11-06',authorAsOf:'2026-11-06',
 sourceHash:'a'.repeat(64),methodologyVersion:'test-only-v1',methodSha256:'b'.repeat(64)},
 tables:{nt_yearly:{rows:[['2022','Neurotech papers',10]]}},audit:{coverage:[]},
 matchedGrowth:{rows:[{id:'eeg',numeratorCounts:{2022:1,2025:2},referenceCounts:null,evidence:['owned-primary:'+'a'.repeat(64)]}],
 evidence:{'venue-n':{normalizedInputSha256:'c'.repeat(64)}}}});
const load = async () => { assert.ok(existsSync(path),'bounded publication feed is not implemented');return import(path); };

test('semantic fingerprint ignores capture/receipt metadata but never values or method changes',async()=>{
 const m=await load();const a=fixture(),b=fixture();
 b.source.capturedAt='2026-11-07T12:00:00Z';b.source.paperAsOf='2026-11-07';b.source.authorAsOf='2026-11-07';b.source.sourceHash='d'.repeat(64);
 b.matchedGrowth.rows[0].evidence=['owned-primary:'+'d'.repeat(64)];b.matchedGrowth.evidence['venue-n'].normalizedInputSha256='e'.repeat(64);
 assert.equal(m.publicationFingerprint(a),m.publicationFingerprint(b));
 b.tables.nt_yearly.rows[0][2]=11;assert.notEqual(m.publicationFingerprint(a),m.publicationFingerprint(b));
 b.tables=a.tables;b.source.methodSha256='f'.repeat(64);assert.notEqual(m.publicationFingerprint(a),m.publicationFingerprint(b));
});

test('fresh stage is bounded, exact anonymous files and production parser remains a hard gate',async()=>{
 const m=await load();assert.equal(typeof m.stagePublicationFiles,'function','offline stage is missing');
 mkdirSync('.qa',{recursive:true});const tmp=mkdtempSync(resolve('.qa/publications-test-'));
 try {
  const snapshot=fixture();const proof={acquisitionManifestSha256:'1'.repeat(64),normalizedSha256:'2'.repeat(64),
   acquisitionMethodSha256:'3'.repeat(64),historyCoverageSha256:'4'.repeat(64),
   acquisitionStartedAt:'2026-11-06T11:00:00Z',acquisitionCompletedAt:snapshot.source.capturedAt,
   rawReceiptCount:181,scienceInputSha256:'5'.repeat(64),matchedInputSha256:'6'.repeat(64),derivationManifestSha256:'7'.repeat(64),
   scienceEvidence:Object.fromEntries(['all','life','social','physical','health'].map(k=>[k,{responseSha256:'8'.repeat(64),requestSha256:'9'.repeat(64),retrievedAt:'2026-11-06T11:00:00Z'}]))};
  const parser=input=>{assert.equal(input.source.testOnly,true);return input;};
  const files=await m.stagePublicationFiles(snapshot,proof,resolve(tmp,'stage'),{parser,allowTestOnly:true});
  assert.deepEqual(Object.keys(files).sort(),[m.PUBLICATION_MANIFEST_PATH,m.PUBLICATION_SNAPSHOT_PATH,'vercel.json'].sort());
  assert.equal(JSON.parse(files[m.PUBLICATION_MANIFEST_PATH]).snapshotSha256,m.publicationHash(files[m.PUBLICATION_SNAPSHOT_PATH]));
  assert.throws(()=>m.assertPublicationTree('100755 blob '+'a'.repeat(40)+'\tvercel.json'));
  await assert.rejects(()=>m.stagePublicationFiles(snapshot,proof,resolve(tmp,'stage'),{parser,allowTestOnly:true}));
  await assert.rejects(()=>m.stagePublicationFiles(snapshot,proof,resolve(tmp,'production')));
  assert.equal(existsSync(resolve(tmp,'production')),false);
  await assert.rejects(()=>m.stagePublicationFiles(snapshot,{...proof,privatePath:'/private/raw'},resolve(tmp,'leak'),{parser,allowTestOnly:true}));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});


test('bounded revision consumer pins HTTPS paths and retains last-good on invalid or oversized data',async()=>{
 const m=await load();assert.equal(typeof m.fetchPublicationRevision,'function','bounded consumer missing');
 const revision='a'.repeat(40),seen=[];
 const fetcher=async(url,options)=>{seen.push(url);assert.equal(options.redirect,'error');return new Response('x'.repeat(33000),{status:200,headers:{'Content-Type':'application/json'}});};
 await assert.rejects(()=>m.fetchPublicationRevision(revision,fetcher));
 assert.ok(seen.every(u=>u.startsWith('https://raw.githubusercontent.com/protocol/neuro-atlas/'+revision+'/feed/openalex-publications/')));
 seen.length=0;await assert.rejects(()=>m.fetchPublicationRevision('../main',fetcher));assert.equal(seen.length,0);
 const fallback={revision,snapshot:fixture()};let fail=false;
 const retained=m.retainingPublicationReader(async()=>{if(fail)throw Error('offline');return {...fallback,revision:'b'.repeat(40)};},fallback);
 const good=await retained();fail=true;assert.equal(await retained(),good);
 const redirect=async()=>new Response('{}',{status:302,headers:{'Content-Type':'application/json'}});
 await assert.rejects(()=>m.fetchPublicationRevision(revision,redirect));
});


const proofFixture=snapshot=>({acquisitionManifestSha256:'1'.repeat(64),normalizedSha256:'2'.repeat(64),
 acquisitionMethodSha256:'3'.repeat(64),historyCoverageSha256:'4'.repeat(64),
 acquisitionStartedAt:'2026-11-06T11:00:00Z',acquisitionCompletedAt:snapshot.source.capturedAt,rawReceiptCount:181,
 scienceInputSha256:'5'.repeat(64),matchedInputSha256:'6'.repeat(64),derivationManifestSha256:'7'.repeat(64),
 scienceEvidence:Object.fromEntries(['all','life','social','physical','health'].map(k=>[k,{responseSha256:'8'.repeat(64),requestSha256:'9'.repeat(64),retrievedAt:'2026-11-06T11:00:00Z'}]))});

test('real local Git CAS publishes only data, verifies readback, keeps freshness-only runs quiet and refuses stale expectations',async()=>{
 const m=await load();assert.equal(typeof m.publishPublicationFeed,'function','CAS publisher missing');
 mkdirSync('.qa',{recursive:true});const tmp=mkdtempSync(resolve('.qa/publications-git-test-'));
 const git=(args,options={})=>{const result=spawnSync('git',args,{cwd:tmp,encoding:'utf8',...options,
  env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Test Only',GIT_AUTHOR_EMAIL:'test@example.invalid',GIT_COMMITTER_NAME:'Test Only',GIT_COMMITTER_EMAIL:'test@example.invalid',...options.env}});
  assert.equal(result.status,0,result.stderr);return result.stdout;};
 const remote=resolve(tmp,'remote');
 try {
  git(['init','-b','main',remote]);
  for(const p of m.PUBLICATION_RUNTIME_PATHS){mkdirSync(resolve(remote,p,'..'),{recursive:true});writeFileSync(resolve(remote,p),readFileSync(p));}
  git(['-C',remote,'add','.']);git(['-C',remote,'commit','-m','test-only reviewed runtime']);
  const approvedRuntime=git(['-C',remote,'rev-parse','HEAD']).trim(),calls=[];
  const runner=(args,options)=>{calls.push(args);return git(args.map(a=>a===m.PUBLICATION_REPOSITORY?remote:a),options);};
  const snapshot=fixture(),opts={allowAbsentBootstrap:true,approvedRuntime,parser:v=>v,allowTestOnly:true};
  const stage=await m.stagePublicationFiles(snapshot,proofFixture(snapshot),resolve(tmp,'stage'),opts);
  const result=await m.publishPublicationFeed(stage,'absent',opts,runner,new Date('2026-11-07T12:00:00Z'));
  const release=await m.fetchPublicationRevision(result.revision,async url=>new Response(stage[url.endsWith('/manifest.json')?m.PUBLICATION_MANIFEST_PATH:m.PUBLICATION_SNAPSHOT_PATH],{headers:{'Content-Type':'application/json'}}),opts);
  assert.deepEqual(release.snapshot,snapshot);
  assert.equal(result.verified,true);assert.equal(result.unchanged,false);
  const ref='refs/heads/'+m.PUBLICATION_BRANCH;
  assert.equal(git(['-C',remote,'rev-parse',ref]).trim(),result.revision);
  const tree=git(['-C',remote,'ls-tree','-r','-t',result.revision]);m.assertPublicationTree(tree);
  assert.equal(git(['-C',remote,'show',result.revision+':'+m.PUBLICATION_SNAPSHOT_PATH]),stage[m.PUBLICATION_SNAPSHOT_PATH]);
  const later=fixture();later.source.capturedAt='2026-11-07T12:00:00Z';later.source.sourceHash='d'.repeat(64);
  const quiet=await m.stagePublicationFiles(later,proofFixture(later),resolve(tmp,'later'),opts);
  const noop=await m.publishPublicationFeed(quiet,result.revision,opts,runner,new Date('2026-11-07T12:00:00Z'));
  assert.equal(noop.unchanged,true);assert.equal(noop.revision,result.revision);
  const changed=fixture();changed.tables.nt_yearly.rows[0][2]=20;
  const next=await m.stagePublicationFiles(changed,proofFixture(changed),resolve(tmp,'changed'),opts);
  const updated=await m.publishPublicationFeed(next,result.revision,opts,runner,new Date('2026-11-07T12:00:00Z'));
  assert.equal(updated.unchanged,false);assert.notEqual(updated.revision,result.revision);
  await assert.rejects(()=>m.publishPublicationFeed(next,result.revision,opts,runner,new Date('2026-11-07T12:00:00Z')));
  assert.equal(git(['-C',remote,'rev-parse',ref]).trim(),updated.revision);
  assert.equal(git(['-C',remote,'rev-parse','main']).trim(),approvedRuntime);
  const pushes=calls.filter(a=>a.includes('push'));assert.equal(pushes.length,2);
  assert.ok(pushes.every(a=>a.some(v=>v.startsWith('--force-with-lease='+ref+':'))));
  await assert.rejects(()=>m.publishPublicationFeed(stage,'absent',{...opts,approvedRuntime:'f'.repeat(40)},runner));
  await assert.rejects(()=>m.publishPublicationFeed({...next,'scripts/evil.ts':'code'},updated.revision,opts,runner));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});


test('production CLI really runs and rejects a synthetic candidate without a partial stage',async()=>{
 mkdirSync('.qa',{recursive:true});const tmp=mkdtempSync(resolve('.qa/publications-cli-test-'));
 try{
  const snapshot=fixture();writeFileSync(resolve(tmp,'snapshot.json'),JSON.stringify(snapshot));
  writeFileSync(resolve(tmp,'proof.json'),JSON.stringify(proofFixture(snapshot)));
  const result=spawnSync('node',['--import','tsx',path,'--stage-json',resolve(tmp,'snapshot.json'),
    '--proof-json',resolve(tmp,'proof.json'),'--out',resolve(tmp,'stage')],{encoding:'utf8'});
  assert.equal(result.status,1,'a missing CLI would silently exit successfully');
  assert.match(result.stderr,/Publication feed operation refused/);
  assert.equal(existsSync(resolve(tmp,'stage')),false);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});


test('staged exact bytes cannot smuggle duplicate-key private metadata past the parser',async()=>{
 const m=await load();mkdirSync('.qa',{recursive:true});const tmp=mkdtempSync(resolve('.qa/publications-byte-test-'));
 try{
  const snapshot=fixture(),options={parser:v=>v,allowTestOnly:true};
  const files=await m.stagePublicationFiles(snapshot,proofFixture(snapshot),resolve(tmp,'stage'),options);
  const duplicate=files[m.PUBLICATION_SNAPSHOT_PATH].replace('"source": {','"source": {"private": "must never publish"}, "source": {');
  const manifest=JSON.parse(files[m.PUBLICATION_MANIFEST_PATH]);manifest.snapshotSha256=m.publicationHash(duplicate);
  await assert.rejects(()=>m.validatePublicationFiles({...files,[m.PUBLICATION_SNAPSHOT_PATH]:duplicate,
   [m.PUBLICATION_MANIFEST_PATH]:JSON.stringify(manifest,null,2)+'\n'},options));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
