import { parseArgs } from 'node:util';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {stageCitationFeed,publishCitationFeed} from './lib/citation-latency-feed-producer';
import {CITATION_FEED_PATH} from '../src/lib/field-velocity/citation-latency-reader';
import {validateCitationBundle,citationFingerprint} from '../src/lib/field-velocity/citation-latency-feed';

async function main() {
 const {values:v}=parseArgs({options:{source:{type:'string'},out:{type:'string'},staged:{type:'string'},publish:{type:'boolean'},expected:{type:'string'},'allow-absent-bootstrap':{type:'boolean'},'allow-historical-stage':{type:'boolean'}}});
 if(v.publish) {
  if(!v.expected || !v.staged || v.source || v.out || v['allow-historical-stage'])throw new Error('Publish requires --staged and explicit --expected; stage is a separate prior action');
  if(v.expected==='absent'&&!v['allow-absent-bootstrap'])throw new Error('Absent bootstrap requires explicit parent-controlled installation --allow-absent-bootstrap');
  const directory=resolve(v.staged);
  const seen:string[]=[];
  const visit=(dir:string,prefix='')=>{for(const name of readdirSync(dir)){const p=resolve(dir,name),stat=lstatSync(p),relative=prefix+name;if(stat.isDirectory())visit(p,relative+'/');else if(stat.isFile()&&!stat.isSymbolicLink())seen.push(relative);else throw new Error('Unapproved staged file mode');}};
  visit(directory);
  if(seen.sort().join('\n')!==[CITATION_FEED_PATH,'vercel.json'].sort().join('\n'))throw new Error('Only the two approved staged paths may publish');
  const files=Object.fromEntries(seen.map(p=>[p,readFileSync(resolve(directory,p),'utf8')]));
  console.log(JSON.stringify(await publishCitationFeed(files,v.expected,{allowAbsentBootstrap:v['allow-absent-bootstrap']})));
 } else {
  if(!v.source||!v.out||v.staged||v.expected||v['allow-absent-bootstrap'])throw new Error('Dry-run staging requires --source <private complete run> --out <fresh .qa directory>');
  const staged=await stageCitationFeed(v.source,v.out,new Date(),v['allow-historical-stage']);
  const data=await validateCitationBundle(JSON.parse(staged.files[CITATION_FEED_PATH]));
  console.log(JSON.stringify({stage:resolve(v.out),generatedAt:staged.generatedAt,fingerprint:await citationFingerprint(data),published:false}));
 }
}
main().catch(()=>{console.error('Citation feed operation refused or failed. Check explicit stage, expected revision, source proof and bootstrap authorization; no automatic retry.');process.exitCode=1;});
