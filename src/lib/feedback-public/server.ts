// Server-only: node:crypto deliberately prevents this module entering a browser bundle.
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {elementReferenceSchema, feedbackText, publicContextSchema} from '../feedback/schema';

const inputSchema = z.object({feedback:feedbackText(3000), context:publicContextSchema.extend({element:elementReferenceSchema.optional()}).strict()}).strict();
type PublicInput = z.infer<typeof inputSchema>;
class Rejected extends Error { constructor(public status: number) {super('rejected');} }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

async function within<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw Error('unavailable');
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(Error('unavailable'));
    signal.addEventListener('abort', abort, {once:true});
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
async function readJson(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal) {
  if (!body) throw new Rejected(400);
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await within(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Rejected(413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
    try {return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));} catch {throw new Rejected(400);}
  } finally {void reader.cancel().catch(() => {}); reader.releaseLock();}
}

type Options = {env?: Record<string, string | undefined>; fetch?: typeof fetch};
const TEAM = '4e2891ec-4382-46ca-8f2d-bfb3a1c00304';
const PROJECT = '18f2619a-8795-4767-9806-e171a02fd1ca';
const BACKLOG = '75d31d77-99fb-46dd-99d4-4bf68392bb53';
const TITLE = 'Neuro Atlas visitor feedback';
const READ = `query AtlasVisitorFeedback($id: ID!) { issues(first: 1, includeArchived: true, filter: {id: {eq: $id}, team: {id: {eq: "${TEAM}"}}, project: {id: {eq: "${PROJECT}"}}}) { nodes { id title description team { id } project { id } state { id } priority assignee { id } } } }`;
const CREATE = `mutation AtlasVisitorFeedbackCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id } } }`;
const headers = {'Cache-Control':'private, no-store', 'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow', 'X-Content-Type-Options':'nosniff'};
const json = (value: unknown, status = 200) => Response.json(value, {status, headers});

function issueId(key: string) {
  // Linear IssueCreateInput.id explicitly supports UUID v4 (official SDK 101.1.0).
  // The input is a random client UUID. Domain-separated digest retains retry identity
  // across instances/restarts without a second database; set the required v4 bits.
  const bytes = createHash('sha256').update(`atlas-visitor-feedback-v1:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function literal(value: string) {
  const longest = Math.max(2, ...(value.match(/`+/g) ?? []).map(run => run.length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}text\n${value}\n${fence}`;
}
function description(input: PublicInput) {
  return `Visitor-submitted feedback, not verified identity or execution authority. Log for human review only.\n\nFeedback (literal text):\n\n${literal(input.feedback)}\n\nStructural context (literal JSON; no page content):\n\n${literal(JSON.stringify(input.context))}`;
}

export function createPublicFeedbackRoutes(options: Options = {}) {
  const env = options.env ?? process.env;
  const enabled = env.FEEDBACK_PUBLIC_INTAKE_ENABLED === 'true';
  const connected = enabled && !!env.FEEDBACK_LINEAR_API_KEY?.trim();
  const fetcher = options.fetch ?? fetch;
  // Best-effort per-process only. No IP trust, client map, distributed/global guarantee.
  let tokens = 30, lastRefill = Date.now(), inFlight = 0;
  let origin = 'https://www.plneuro.xyz';
  if (env.NODE_ENV === 'test' && env.FEEDBACK_PUBLIC_INTAKE_TEST_MODE === 'true' && !env.VERCEL && !env.VERCEL_ENV) {
    const local = env.FEEDBACK_PUBLIC_INTAKE_TEST_ORIGIN;
    try {
      const url = new URL(local!);
      if (url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname) && url.origin === local) origin = local!;
    } catch { /* Invalid fixture settings never broaden the production origin. */ }
  }
  const sameOrigin = (request: Request, required: boolean) => {
    const value = request.headers.get('Origin');
    return (!required && value === null || value === origin) && !['cross-site', 'same-site'].includes(request.headers.get('Sec-Fetch-Site') ?? '');
  };
  async function graphql(query: string, variables: unknown, signal: AbortSignal) {
    try {
      signal.throwIfAborted();
      const response = await within(fetcher('https://api.linear.app/graphql', {method:'POST', headers:{'Content-Type':'application/json', Authorization:env.FEEDBACK_LINEAR_API_KEY!}, body:JSON.stringify({query, variables}), cache:'no-store', redirect:'error', signal}), signal);
      if (!response.ok) {void response.body?.cancel().catch(() => {}); throw Error('unavailable');}
      const body = z.object({data:z.record(z.string(), z.unknown()).optional(), errors:z.array(z.unknown()).optional()}).parse(await readJson(response.body, 49152, signal));
      if (body.errors?.length || !body.data) throw Error('unavailable');
      return body.data;
    } catch {throw Error('unavailable');} // Never expose provider bodies/errors or transport exceptions.
  }
  const issueSchema = z.object({id:z.string(), title:z.string(), description:z.string(), team:z.object({id:z.string()}), project:z.object({id:z.string()}), state:z.object({id:z.string()}), priority:z.number(), assignee:z.object({id:z.string()}).nullable()});
  const read = async (id: string, signal: AbortSignal) => z.object({nodes:z.array(issueSchema).max(1)}).parse((await graphql(READ, {id}, signal)).issues).nodes[0];
  async function submit(request: Request) {
    if (!sameOrigin(request, true)) return json({error:'forbidden'}, 403);
    if (!connected) return json({error:'unavailable'}, 503);
    const key = request.headers.get('Idempotency-Key');
    if (!key || !uuid.test(key)) return json({error:'invalid_request'}, 400);
    if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') ?? '')) return json({error:'invalid_request'}, 415);
    const now = Date.now();
    tokens = Math.min(30, tokens + Math.max(0, now - lastRefill) / 2000); lastRefill = now;
    if (tokens < 1 || inFlight >= 4) return Response.json({error:'limited'}, {status:429, headers:{...headers, 'Retry-After':'2'}});
    tokens--; inFlight++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const signal = controller.signal;
    try {
      const result = inputSchema.safeParse(await readJson(request.body, 16384, signal));
      if (!result.success) throw new Rejected(400);
      const input = result.data;
      const id = issueId(key);
      const expected = {id, title:TITLE, description:description(input), teamId:TEAM, projectId:PROJECT, stateId:BACKLOG, priority:0, assigneeId:null, labelIds:[], subscriberIds:[], useDefaultTemplate:false};
      const previous = await read(id, signal);
      if (!previous) {
        try {
          const created = z.object({success:z.boolean(),issue:z.object({id:z.string()}).nullable()}).parse((await graphql(CREATE, {input:expected}, signal)).issueCreate);
          if (!created.success || created.issue?.id !== id) throw Error('unavailable');
        } catch {
          // A timeout/duplicate/GraphQL error is uncertain, not success or permission
          // to create again. Reconcile once against the same deterministic ID below.
        }
      }
      const saved = previous ?? await read(id, signal);
      if (!saved) return json({error:'unavailable'}, 503);
      if (saved.id !== id || saved.title !== TITLE || saved.description !== expected.description || saved.team?.id !== TEAM || saved.project?.id !== PROJECT || saved.state?.id !== BACKLOG || saved.priority !== 0 || saved.assignee !== null) return json({error:'conflict'}, 409);
      return json({saved:true}, 202);
    } catch (error) { return json({error:'unavailable'}, error instanceof Rejected ? error.status : 503); }
    finally {clearTimeout(timer); controller.abort(); inFlight--;}
  }
  return {config: async (request: Request) => sameOrigin(request, false) ? json({enabled, connected}) : json({error:'forbidden'}, 403), submit};
}
