import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { approvalHash } from '../scripts/feedback/engine.ts';

export async function setup(t) {
  const dir=await mkdtemp(path.join(tmpdir(),'atlas-feedback-pg-'));let pg=new PGlite(dir);
  const migration=await readFile(process.env.FEEDBACK_TEST_MIGRATION??new URL('../db/feedback/001-feedback.sql',import.meta.url),'utf8');await pg.exec(migration);await pg.exec(await readFile(new URL('../db/feedback/002-worker.sql',import.meta.url),'utf8'));
  t.after(async()=>{await pg.close();await rm(dir,{recursive:true,force:true})});
  const adapt=p=>({query:async(sql,params)=>{const r=await p.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}},transaction:fn=>p.transaction(tx=>fn(adapt(tx)))});
  let db=adapt(pg);
  const task={title:'Spacing',summary:'Increase spacing',acceptance:['Readable']},context={route:'/',viewport:{width:1000,height:800},theme:'light'},approval=approvalHash(task,context);
  async function seed(){const id=randomUUID(),job=randomUUID();await db.query("INSERT INTO atlas_feedback.feedback(id,owner_github_id,version,state,input_private,approved_public,public_context,approval_hash,approval_version) VALUES($1,82394590,1,'queued',$2,$3,$4,$5,'atlas-feedback-v1')",[id,{privateComment:'PRIVATE_CANARY'},task,context,approval]);await db.query('INSERT INTO atlas_feedback.jobs(id,feedback_id,input_version,approval_hash,payload) VALUES($1,$2,1,$3,$4)',[job,id,approval,{feedbackId:id,inputVersion:1,approvalHash:approval,publicTask:task,publicContext:context}]);return {id,job};}
  return {get db(){return db;},seed,restart:async()=>{await pg.close();pg=new PGlite(dir);db=adapt(pg);return db}};
}
test('actual PostgreSQL migration: disabled defaults, global lease, durable reservations, caps, kill and fencing',async t=>{
  const { PgWorkStore }=await import('../scripts/feedback/pg-store.ts');const f=await setup(t);const one=await f.seed();
  const {pathToFileURL}=await import('node:url');const intake=await import(process.env.FEEDBACK_TEST_INTAKE_MODULE?pathToFileURL(process.env.FEEDBACK_TEST_INTAKE_MODULE).href:new URL('../src/lib/feedback/intake.ts',import.meta.url).href);
  const payload=(await f.db.query('SELECT payload FROM atlas_feedback.jobs WHERE id=$1',[one.job])).rows[0].payload;assert.equal(payload.approvalHash,intake.publicApprovalHash({publicApproval:{policyVersion:'atlas-feedback-v1'},publicTask:payload.publicTask,context:payload.publicContext}));
  let store=new PgWorkStore(f.db,{trustedBaseSha:'a'.repeat(40)});
  assert.equal(await store.acquire(),null);
  await f.db.query("UPDATE atlas_feedback.control SET enabled=true,allowed_owner_id=82394590,max_job_usd=1,max_day_usd=2,max_tokens=10000,max_turns=2,max_wall_seconds=60,max_attempts=2");
  const cap=await store.acquire();assert.equal(cap.jobId,one.job);assert.ok(!JSON.stringify(cap).includes('PRIVATE_CANARY'));assert.equal(await store.acquire(),null);
  const id=await store.reserve(cap,0.6,1000);await assert.rejects(store.reserve(cap,0.6,1000),/budget/);
  await store.reconcile(cap,id,0.2);await store.reconcile(cap,id,0.2);
  assert.equal((await f.db.query('SELECT state FROM atlas_feedback.worker_reservations WHERE id=$1',[id])).rows[0].state,'settled');
  let row=(await f.db.query('SELECT reserved_cost,charged_cost FROM atlas_feedback.jobs WHERE id=$1',[one.job])).rows[0];assert.equal(Number(row.reserved_cost),0);assert.equal(Number(row.charged_cost),0.2);
  const unknown=await store.reserve(cap,0.7,1000);await store.unknown(cap,unknown);
  store=new PgWorkStore(await f.restart(),{trustedBaseSha:'a'.repeat(40)});await assert.rejects(store.reserve(cap,0.2,1000),/budget/);
  await f.db.query('UPDATE atlas_feedback.control SET enabled=false');await assert.rejects(store.assertActive(cap),/fenced/);
  await f.db.query('UPDATE atlas_feedback.control SET enabled=true,fencing_token=fencing_token+1');await assert.rejects(store.transition(cap,'working'),/fenced/);
});
