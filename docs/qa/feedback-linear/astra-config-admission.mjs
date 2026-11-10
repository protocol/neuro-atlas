// Offline example-admission regression. No preflight, account, subprocess or model request.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HermesAstraModel} from '../../../scripts/feedback-linear/hermes-model.ts';
import {normalizeFeedback} from '../../../src/lib/feedback/schema.ts';
import {FEEDBACK_TARGET_IDS,FEEDBACK_CHART_IDS,FEEDBACK_SCENARIOS} from '../../../src/lib/feedback/contracts.ts';
import {CSS_PATHS} from '../../../scripts/feedback/validator.ts';
const root=new URL('../../../',import.meta.url),doc=await readFile(new URL('docs/feedback-linear-astra.md',root),'utf8');
const operator=JSON.parse(doc.match(/\{"provider":"hermes-astra","budget":.*\}/)[0]),config={...operator.model,enabled:true};
const sources=Object.fromEntries(await Promise.all(CSS_PATHS.map(async p=>[p,await readFile(new URL(p,root),'utf8')]))),baseSha='a'.repeat(40);
const longest=values=>[...values].sort((a,b)=>b.length-a.length)[0];
const tags=Array(24).fill('a'.repeat(32));for(let i=0;i<tags.length;i++){const next=[...tags];next[i]+=':nth-of-type(10000)';if(next.join(' > ').length<=1024)tags[i]=next[i];}
const element={selector:tags.join(' > '),tagName:'a'.repeat(32),role:'a'.repeat(32),classes:Array(8).fill('a'.repeat(64))};assert.ok(element.selector.length>=1000);
const cases=[{name:'short',feedback:'Increase card padding.',context:{route:'/',viewport:{width:390,height:1000},theme:'light'}},{name:'maximum-note-and-structural-context',feedback:'\u0800'.repeat(3000),context:{route:'/field-velocity',targetId:longest(FEEDBACK_TARGET_IDS),chartId:longest(FEEDBACK_CHART_IDS),scenario:longest(FEEDBACK_SCENARIOS),viewport:{width:10000,height:10000},theme:'system',deployedRevision:baseSha,element}}];
for(const c of cases){let reserved=0,called=0,units;const sentinel=new Error('SYNTHETIC_ADMISSION_ONLY');const model=new HermesAstraModel(config,async request=>{called++;units=Buffer.byteLength(request.instructions)+Buffer.byteLength(request.user)+1024;throw sentinel;});await assert.rejects(model.generate({...normalizeFeedback({feedback:c.feedback,context:c.context,processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'}}),baseSha,sources},{assertActive:async()=>{},reserve:async estimate=>{reserved++;assert.ok(estimate<=100000);return 'synthetic-admission-only';},complete:async()=>{throw Error('No completion is permitted');}}),error=>error===sentinel);assert.equal(reserved,1);assert.equal(called,1);assert.ok(units<=config.maxInputTokens);console.log(JSON.stringify({case:c.name,cssBytes:Object.values(sources).reduce((n,s)=>n+Buffer.byteLength(s),0),inputAdmissionUnits:units,configuredMax:config.maxInputTokens,totalAdmissionEstimateLimit:100000,syntheticPortReached:true,realInference:0}));}
