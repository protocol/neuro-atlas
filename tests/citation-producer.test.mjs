import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture} from './helpers/citation-fixture.mjs';
import {publishCitationFeed,stageCitationFeed,DATA_BRANCH_VERCEL,citationPublishTarget} from '../scripts/lib/citation-latency-feed-producer.ts';
import {CITATION_FEED_PATH} from '../src/lib/field-velocity/citation-latency-reader.ts';
const now=new Date('2026-10-28T23:00:00Z');
const files = () => ({[CITATION_FEED_PATH]:JSON.stringify(fixture(),null,2)+'\n','vercel.json':DATA_BRANCH_VERCEL});
const scratch=()=>{mkdirSync('.qa',{recursive:true});return mkdtempSync('.qa/citation-producer-');};
function git(args,{cwd,input,env}={}) {
 const result=spawnSync('git',args,{cwd,input,encoding:'utf8',env:{...process.env,GIT_AUTHOR_NAME:'SYNTHETIC_PRIVATE',GIT_AUTHOR_EMAIL:'synthetic@example.invalid',GIT_COMMITTER_NAME:'SYNTHETIC_PRIVATE',GIT_COMMITTER_EMAIL:'synthetic@example.invalid',...env}});
 if(result.status!==0)throw new Error(result.stderr);return result.stdout;
}
test('absent bootstrap and invalid payloads cannot reach Git without explicit parent-controlled installation opt-in',async()=>{
 const commands=[];const noGit=args=>{commands.push(args);throw new Error('Unexpected git');};
 await assert.rejects(()=>publishCitationFeed(files(),'absent',{},noGit,now),/bootstrap/i);
 await assert.rejects(()=>publishCitationFeed({...files(),'extra':'bad'},'1'.repeat(40),{},noGit,now),/paths|approved/);
 const invalid=files();invalid[CITATION_FEED_PATH]=JSON.stringify({...fixture(),private:'bad'});
 await assert.rejects(()=>publishCitationFeed(invalid,'1'.repeat(40),{},noGit,now));
 assert.equal(commands.length,0);
});
test('source stage rejects missing receipt proof before creating destination',async()=>{
 const dir=scratch();try{
  await assert.rejects(()=>stageCitationFeed(`${dir}/missing`,`${dir}/stage`,now));
  assert.equal(existsSync(`${dir}/stage`),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('private admission refuses malformed successful HTTP receipt shapes before they can become missing observations',async()=>{
 const {assertCitationReceipt}=await import('../scripts/lib/citation-latency-feed-producer.ts');
 assert.equal(typeof assertCitationReceipt,'function');
 assert.throws(()=>assertCitationReceipt({request:{filter:'publication_year:2023','per-page':1},response:{meta:{count:-1}}}));
 assert.throws(()=>assertCitationReceipt({request:{filter:'title_and_abstract.search:query,publication_year:2023',sample:80},response:{}}));
 assert.throws(()=>assertCitationReceipt({request:{filter:'openalex_id:W1',select:'id,publication_year'},response:{results:[{id:'https://openalex.org/W2',publication_year:2020}]}}));
});
test('explicit source stage independently replays every private receipt and rejects mismatched public provenance',async()=>{
 const {readFileSync,writeFileSync}=await import('node:fs');
 const dir=scratch();try{
  const source=resolve(dir,'SYNTHETIC_TEST_SOURCE');
  const generated=spawnSync('python3',['tests/helpers/citation-synthetic-source.py',source],{encoding:'utf8'});
  assert.equal(generated.status,0,generated.stderr);
  const staged=await stageCitationFeed(source,`${dir}/stage`);
  assert.equal(staged.published,false);
  assert.deepEqual(Object.keys(staged.files).sort(),[CITATION_FEED_PATH,'vercel.json'].sort());
  assert.equal(JSON.parse(staged.files[CITATION_FEED_PATH]).csv,readFileSync(`${source}/neurotech.csv`,'utf8'));
  const provenance=JSON.parse(readFileSync(`${source}/provenance.json`,'utf8'));
  provenance.receiptCount++;
  writeFileSync(`${source}/provenance.json`,JSON.stringify(provenance));
  await assert.rejects(()=>stageCitationFeed(source,`${dir}/bad`),/manifest|provenance|receipt/i);
  assert.equal(existsSync(`${dir}/bad`),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('real local bare remote CAS, strict two-file modes, public identity, semantic no-op and race refusal',async()=>{
 const dir=scratch(),remote=resolve(dir,'remote.git'),commands=[];
 const run=(args,options)=>{commands.push(args);return git(args.map(a=>a===citationPublishTarget.repository?remote:a),options);};
 try{
  git(['init','--bare',remote]);
  const first=await publishCitationFeed(files(),'absent',{allowAbsentBootstrap:true},run,now);
  assert.equal(first.verified,true);
  assert.equal(git(['--git-dir',remote,'show-ref','--heads']).includes('refs/heads/main'),false);
  const paths=git(['--git-dir',remote,'ls-tree','-r','--name-only',first.revision]).trim().split('\n');
  assert.deepEqual(paths,[CITATION_FEED_PATH,'vercel.json']);
  assert.match(git(['--git-dir',remote,'show','--no-patch','--format=%an <%ae> %cn <%ce>',first.revision]),/^Neuro Atlas data refresh <neuro-atlas-data@users.noreply.github.com> Neuro Atlas data refresh/);
  assert.ok(commands.some(a=>a.includes(`--force-with-lease=${citationPublishTarget.ref}:`)));
  const unchanged=await publishCitationFeed(files(),first.revision,{},run,now);
  assert.equal(unchanged.unchanged,true);assert.equal(unchanged.revision,first.revision);
  const changed=fixture();changed.csv=changed.csv.replace('6,5.0,8,1373','6,5.0,9,1373');
  const {citationHash}=await import('../src/lib/field-velocity/citation-latency-feed.ts');
  changed.provenance.csvSha256=await citationHash(changed.csv);
  const nextFiles={...files(),[CITATION_FEED_PATH]:JSON.stringify(changed,null,2)+'\n'};
  const second=await publishCitationFeed(nextFiles,first.revision,{},run,now);
  assert.equal(second.verified,true);
  assert.notEqual(second.revision,first.revision);
  assert.equal(git(['--git-dir',remote,'cat-file','-p',second.revision]).split('\n').find(line=>line.startsWith('parent ')),`parent ${first.revision}`);
  const third=fixture();third.csv=third.csv.replace('6,5.0,8,1373','6,5.0,10,1373');third.provenance.csvSha256=await citationHash(third.csv);
  const thirdFiles={...files(),[CITATION_FEED_PATH]:JSON.stringify(third,null,2)+'\n'};
  let raced=false;
  const racing=(args,options)=>{
   if(args.includes('push')&&!raced){raced=true;const tree=git(['--git-dir',remote,'rev-parse',`${second.revision}^{tree}`]).trim();const competitor=git(['--git-dir',remote,'commit-tree',tree,'-p',second.revision,'-m','Synthetic competitor']).trim();git(['--git-dir',remote,'update-ref',citationPublishTarget.ref,competitor,second.revision]);}
   return run(args,options);
  };
  await assert.rejects(()=>publishCitationFeed(thirdFiles,second.revision,{},racing,now),/operation|lease|changed|stale|rejected/i);
  assert.equal(raced,true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
