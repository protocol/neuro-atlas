import {open, mkdir, lstat, readFile, rename, rm, realpath, readdir} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {sha256} from '../feedback/validator';

export type AttemptBudget = {kind: 'attempts'; maxAttemptsPerDay: number; timeZone: string};
export type AttemptRequest = {tokenPolicy?:'attempt-count-v1';job: string; tokens: number; budget: AttemptBudget; provider: 'hermes-astra'; account: string; model: string; policyDigest: string};
export type Attempt = {tokenPolicy?:'attempt-count-v1';id: string; job: string; tokens: number; day: string; timeZone: string; at: number; provider: 'hermes-astra'; account: string; model: string; policyDigest: string; status: 'reserved' | 'completed'; usage?: {inputTokens: number; outputTokens: number}; pricing: 'UNPRICED'; chargedUsd: null};
export type State = {schema: 1; fence: number; jobs: Record<string, unknown>; events: Record<string, string>; spend: {id: string; day: string; job: string; upper: number; tokens: number; actual?: number}[]; attempts: Attempt[]};
const attemptSchema = z.object({tokenPolicy:z.literal('attempt-count-v1').optional(),id:z.string().uuid(),job:z.string().min(1),tokens:z.number().int().positive(),day:z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),timeZone:z.string().min(1),at:z.number().int().nonnegative(),provider:z.literal('hermes-astra'),account:z.string().min(1),model:z.string().min(1),policyDigest:z.string().regex(/^[a-f0-9]{64}$/),status:z.enum(['reserved','completed']),usage:z.object({inputTokens:z.number().int().nonnegative(),outputTokens:z.number().int().nonnegative()}).strict().optional(),pricing:z.literal('UNPRICED'),chargedUsd:z.null()}).strict().refine(s=>s.status === 'reserved' ? s.usage === undefined : s.usage !== undefined && (s.tokenPolicy==='attempt-count-v1'||s.usage.inputTokens+s.usage.outputTokens <= s.tokens));
const spendSchema = z.object({id:z.string(),day:z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),job:z.string(),upper:z.number().finite().positive(),tokens:z.number().int().positive(),actual:z.number().finite().nonnegative().optional()}).strict().refine(s=>s.actual===undefined || s.actual<=s.upper);
const stateSchema = z.object({schema:z.literal(1),fence:z.number().int().nonnegative(),jobs:z.record(z.string(),z.unknown()),events:z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/)),spend:z.array(spendSchema),attempts:z.array(attemptSchema).default([])}).strict().refine(s=>new Set(s.spend.map(r=>r.id)).size===s.spend.length && new Set(s.attempts.map(r=>r.id)).size===s.attempts.length && new Set(s.attempts.map(r=>r.job)).size===s.attempts.length);
const initial = (): State => ({schema: 1, fence: 0, jobs: {}, events: {}, spend: [], attempts: []});
const fail = (): never => {throw new Error('private_state_invalid');};
/** Single trusted host/filesystem only. No timeout takeover: an orphaned lock is a stop. */
export class PrivateFiles {
  private held = false;
  constructor(readonly root: string) {}
  async init() {
    await mkdir(this.root, {recursive: true, mode: 0o700});
    const s = await lstat(this.root);
    if (!s.isDirectory() || s.isSymbolicLink() || (s.mode & 0o077) || await realpath(this.root) !== path.resolve(this.root)) fail();
  }
  private async syncDirectory() {
    const handle = await open(this.root, 'r');
    try {await handle.sync();} finally {await handle.close();}
  }
  async read(): Promise<State> {
    await this.init();
    try {
      const text = await this.bytes('state.json');
      const result = stateSchema.safeParse(JSON.parse(text.toString()));
      if (!result.success || (await readdir(this.root)).includes('attempts-initialized') && !Object.hasOwn(JSON.parse(text.toString()), 'attempts')) return fail();
      return result.data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if ((await readdir(this.root)).some(name => name !== '.lock')) return fail();
        return initial();
      }
      throw error;
    }
  }
  async bytes(name: string): Promise<Buffer> {
    if (!/^[a-zA-Z0-9.-]+$/.test(name)) fail();
    const file = path.join(this.root, name), s = await lstat(file);
    if (!s.isFile() || s.isSymbolicLink() || (s.mode & 0o077) || s.size > 16 * 1024 * 1024) fail();
    return readFile(file);
  }
  private async atomic(name: string, bytes: Buffer) {
    if (!this.held) fail();
    const tmp = path.join(this.root, '.tmp-' + randomUUID());
    const h = await open(tmp, 'wx', 0o600);
    try {await h.writeFile(bytes); await h.sync();} finally {await h.close();}
    await rename(tmp, path.join(this.root, name));
    await this.syncDirectory();
  }
  async reserveAttempt(state: State, request: AttemptRequest, at = Date.now()): Promise<string> {
    const {budget} = request;
    if (!this.held || budget.kind !== 'attempts' || !Number.isSafeInteger(budget.maxAttemptsPerDay) || budget.maxAttemptsPerDay < 1 || budget.maxAttemptsPerDay > 5 || !Number.isSafeInteger(request.tokens) || request.tokens < 1 || !Number.isSafeInteger(at) || at < 0) throw new Error('attempt_budget');
    let day: string;
    try {day = new Intl.DateTimeFormat('en-CA', {timeZone:budget.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));} catch {throw new Error('attempt_budget');}
    if (state.attempts.some(row=>row.timeZone !== budget.timeZone || row.job === request.job) || state.spend.some(row=>row.job === request.job) || state.attempts.filter(row=>row.day === day).length >= budget.maxAttemptsPerDay) throw new Error('attempt_budget');
    const row: Attempt = {...(request.tokenPolicy!==undefined?{tokenPolicy:request.tokenPolicy}:{}),id:randomUUID(),job:request.job,tokens:request.tokens,day,timeZone:budget.timeZone,at,provider:request.provider,account:request.account,model:request.model,policyDigest:request.policyDigest,status:'reserved',pricing:'UNPRICED',chargedUsd:null};
    if (!attemptSchema.safeParse(row).success) throw new Error('attempt_budget');
    await this.atomic('attempts-initialized', Buffer.from('atlas-linear-attempts-v1'));
    state.attempts.push(row); await this.save(state); return row.id;
  }
  async save(state: State) {
    // Persist an initialization marker BEFORE the first manifest. Partial/lost state is a stop.
    await this.atomic('initialized', Buffer.from('atlas-linear-private-state-v1'));
    await this.atomic('state.json', Buffer.from(JSON.stringify(state)));
  }
  async artifact(bytes: Buffer): Promise<string> {
    const digest = sha256(bytes), name = digest + '.artifact';
    await this.atomic(name, bytes);
    return digest;
  }
  async artifactBytes(digest: string) {
    if (!/^[a-f0-9]{64}$/.test(digest)) fail();
    const bytes = await this.bytes(digest + '.artifact');
    if (sha256(bytes) !== digest) fail();
    return bytes;
  }
  async lock<T>(fn: (state: State) => Promise<T>): Promise<T> {
    await this.init();
    const lock = path.join(this.root, '.lock');
    try {await mkdir(lock, {mode: 0o700});} catch {throw new Error('host_locked');}
    this.held = true;
    try {
      const h = await open(path.join(lock, 'owner.json'), 'wx', 0o600);
      try {await h.writeFile(JSON.stringify({pid: process.pid, instance: randomUUID()})); await h.sync();} finally {await h.close();}
      await this.syncDirectory();
      return await fn(await this.read());
    } finally {
      this.held = false;
      await rm(lock, {recursive: true}); await this.syncDirectory();
    }
  }
}
