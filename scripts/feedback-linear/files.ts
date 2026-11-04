import {open, mkdir, lstat, readFile, rename, rm, realpath, readdir} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {sha256} from '../feedback/validator';

export type State = {schema: 1; fence: number; jobs: Record<string, unknown>; events: Record<string, string>; spend: {id: string; day: string; job: string; upper: number; tokens: number; actual?: number}[]};
const spendSchema = z.object({id:z.string(),day:z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),job:z.string(),upper:z.number().finite().positive(),tokens:z.number().int().positive(),actual:z.number().finite().nonnegative().optional()}).strict().refine(s=>s.actual===undefined || s.actual<=s.upper);
const stateSchema = z.object({schema:z.literal(1),fence:z.number().int().nonnegative(),jobs:z.record(z.string(),z.unknown()),events:z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/)),spend:z.array(spendSchema)}).strict().refine(s=>new Set(s.spend.map(r=>r.id)).size===s.spend.length);
const initial = (): State => ({schema: 1, fence: 0, jobs: {}, events: {}, spend: []});
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
      if (!result.success) return fail();
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
