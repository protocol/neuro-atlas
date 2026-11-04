import {randomUUID, sign, createPublicKey, type KeyLike} from 'node:crypto';
import {PrivateFiles, type State, type AttemptBudget} from './files';
import {HermesAstraModel, hermesModelSchema, type HermesModelConfig} from './hermes-model';
import {validateNative, hostPayload, fresh, type InputPolicy} from './input';
import {captureSchema, assertPng, deliverySchema, decisionSchema, threadSchema, type ThreadRequest, type Proposal} from './evidence';
import {canonical, approvalHash} from '../feedback/engine';
import {publishBundle, verifyBundle, type Publication} from '../feedback/publisher';
import type {GitHubConfig} from '../feedback/github';
import {sha256, validatePatch, CSS_PATHS, type Patch} from '../feedback/validator';
import {loadSnapshot, applyValidatedPatch, verifyAppliedPatch} from '../feedback/git-sandbox';
import {withCheckout} from '../feedback/runtime';
import {runTrustedChecks} from '../feedback/checks';
import {AnthropicModel, type ModelConfig} from '../feedback/model';
import {allowedOrigin, boundedJson} from '../feedback/http';
import {normalizeFeedback} from '../../src/lib/feedback/schema';
import type {CheckReceipt, Bundle} from '../feedback/ports';

type ReviewCommon = {enabled?: boolean; root: string; repo: string; inputPolicy: InputPolicy; channelId: string; reviewerIds: string[]; capturePublicKey: InputPolicy['hostPublicKey']; readNative: () => Promise<unknown>; readReviewThread?: (request: ThreadRequest) => Promise<unknown>; mainOrigin: string; fixture?: boolean; maxTokens: number; maxWallMs: number; proposalTtlMs: number};
// An omitted provider is the old explicit Anthropic/positive-USD fixture contract only.
export type ReviewConfig = ReviewCommon & (
  {provider?: 'anthropic'; budget?: {kind: 'usd'}; maxJobUsd: number; maxDayUsd: number; model: ModelConfig; modelKey: () => string} |
  {provider: 'hermes-astra'; budget: AttemptBudget; maxJobUsd?: never; maxDayUsd?: never; model: HermesModelConfig; modelKey?: never}
);
type CheckedInput = ReturnType<typeof validateNative>;
export type Candidate = {schema: 1; revision: number; input: CheckedInput; baseSha: string; patch: Patch; checks: {baseline: CheckReceipt; candidate: CheckReceipt}; sourcesDigest: string; policyDigest: string; preparedAt: number; expiresAt: number};
export type Job = {state: string; fence: number; inputHash: string; candidateDigest?: string; proposalDigest?: string; deliveryDigest?: string; decisionDigest?: string; threadDigest?: string; bundleDigest?: string; publication?: Publication; result?: {number:number;url:string;headSha:string}; reason?: string};
const blocked = (): never => {throw new Error('review_blocked');};
const hash = (value: unknown) => sha256(canonical(value));
export class ReviewController {
  readonly files: PrivateFiles;
  constructor(readonly config: ReviewConfig) {this.files = new PrivateFiles(config.root);}
  /** No production automation until an independent monotonic intake witness is implemented.
   * This is not an operator attestation/enable flag. Only isolated loopback fixtures proceed. */
  assertHistoryWitness() {
    const origin=new URL(this.config.mainOrigin);
    if (this.config.fixture!==true || origin.protocol!=='http:' || origin.hostname!=='127.0.0.1' || origin.origin!==this.config.mainOrigin) throw new Error('native_history_witness_unavailable');
  }
  private enabled() {
    this.assertHistoryWitness();
    const c = this.config;
    this.providerEnabled();
    if (c.enabled !== true || !c.channelId || !c.reviewerIds.length || new Set(c.reviewerIds).size !== c.reviewerIds.length || ![c.maxTokens,c.maxWallMs,c.proposalTtlMs].every(x => Number.isFinite(x) && x > 0) || !Number.isSafeInteger(c.maxTokens) || !Number.isSafeInteger(c.maxWallMs) || c.maxWallMs > 600000 || c.proposalTtlMs > 86400000 || !allowedOrigin(c.mainOrigin, 'https://api.github.com', c.fixture)) blocked();
  }
  private providerEnabled() {
    const c = this.config;
    if (c.provider === 'hermes-astra') {
      if (c.budget?.kind !== 'attempts' || !Number.isSafeInteger(c.budget.maxAttemptsPerDay) || c.budget.maxAttemptsPerDay < 1 || c.budget.maxAttemptsPerDay > 5 || !c.budget.timeZone || !hermesModelSchema.safeParse(c.model).success || Object.hasOwn(c,'maxJobUsd') || Object.hasOwn(c,'maxDayUsd') || Object.hasOwn(c,'modelKey')) blocked();
      try {new Intl.DateTimeFormat('en-CA',{timeZone:c.budget.timeZone});} catch {blocked();}
    } else if ((c.provider !== undefined && c.provider !== 'anthropic') || (c.budget !== undefined && c.budget.kind !== 'usd') || ![c.maxJobUsd,c.maxDayUsd].every(x=>Number.isFinite(x) && x>0)) blocked();
  }
  private settled(state: State, id: string) {
    return this.config.provider === 'hermes-astra'
      ? state.attempts.filter(a=>a.job===id).length === 1 && state.attempts.find(a=>a.job===id)?.status === 'completed'
      : state.spend.filter(s=>s.job===id).length === 1 && !state.spend.some(s=>s.job===id && s.actual===undefined);
  }
  private policyDigest() {
    const c = this.config;
    return hash({owner: c.inputPolicy.ownerId, workspace: c.inputPolicy.workspace, project: c.inputPolicy.projectId, team: c.inputPolicy.teamId, channel: c.channelId, reviewers: c.reviewerIds, provider:c.provider ?? 'anthropic', budget:c.provider === 'hermes-astra' ? c.budget : {kind:'usd',maxJobUsd:c.maxJobUsd,maxDayUsd:c.maxDayUsd}, model: c.model, caps: [c.maxTokens,c.maxWallMs,c.proposalTtlMs]});
  }
  private async main() {
    const response = await fetch(this.config.mainOrigin + '/repos/protocol/neuro-atlas/git/ref/heads/main', {redirect: 'error', signal: AbortSignal.timeout(15000)});
    const data = await boundedJson(response, 8192) as {ref?: string; object?: {sha?: string}};
    if (data.ref !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(data.object?.sha ?? '')) blocked();
    return data.object!.sha!;
  }
  private input() {return this.config.readNative().then(value => validateNative(value, this.config.inputPolicy));}
  private job(state: State, id: string): Job {const j = state.jobs[id] as Job | undefined; if (!j) return blocked(); return j;}
  async status(id: string) {return this.job(await this.files.read(), id);}
  private async revalidate(job: Job): Promise<{candidate: Candidate; sources: Record<string,string>}> {
    this.enabled();
    if (!job.candidateDigest) return blocked();
    const candidate = JSON.parse((await this.files.artifactBytes(job.candidateDigest)).toString()) as Candidate;
    const current = await this.input();
    if (candidate.schema !== 1 || candidate.revision !== 1 || candidate.policyDigest !== this.policyDigest() || candidate.expiresAt <= Date.now() || candidate.input.recordHash !== job.inputHash || current.recordHash !== job.inputHash || current.record.feedbackId !== candidate.input.record.feedbackId || await this.main() !== candidate.baseSha) return blocked();
    const sources = await withCheckout(this.config.repo, candidate.baseSha, false, async cwd => loadSnapshot(cwd, candidate.baseSha));
    if (hash(sources) !== candidate.sourcesDigest) return blocked();
    validatePatch(candidate.patch, sources, candidate.baseSha, 'css-only');
    return {candidate, sources};
  }
  async capturePlan(id: string) {
    return this.files.lock(async state => {
      const job = this.job(state,id);
      if (job.state !== 'awaiting_capture') return blocked();
      const {candidate} = await this.revalidate(job);
      return {candidate, candidateDigest: job.candidateDigest!};
    });
  }
  async attachCapture(id: string, receipt: unknown, before: Buffer, after: Buffer): Promise<Job> {
    return this.files.lock(async state => {
      const job = this.job(state,id), {candidate} = await this.revalidate(job);
      if (job.state !== 'awaiting_capture') return blocked();
      const cap = hostPayload(receipt,'atlas-linear-capture-v1',this.config.capturePublicKey,captureSchema);
      fresh(cap.at);
      const context = candidate.input.record.input.context;
      if (cap.at < candidate.preparedAt || cap.candidateDigest !== job.candidateDigest || cap.baseSha !== candidate.baseSha || cap.patchDigest !== hash(candidate.patch) || cap.checksDigest !== hash(candidate.checks) || cap.before.digest !== sha256(before) || cap.after.digest !== sha256(after) || cap.before.digest === cap.after.digest || cap.route !== context.route || cap.theme !== context.theme || cap.before.width !== context.viewport.width || cap.before.height !== context.viewport.height || cap.after.width !== cap.before.width || cap.after.height !== cap.before.height) return blocked();
      assertPng(before,cap.before); assertPng(after,cap.after);
      const beforeDigest = await this.files.artifact(before), afterDigest = await this.files.artifact(after);
      const captureDigest = await this.files.artifact(Buffer.from(canonical(receipt)));
      const proposal: Proposal = {schema:1,revision:1,candidateDigest:job.candidateDigest!,captureDigest,beforeDigest,afterDigest,channelId:this.config.channelId,inputHash:job.inputHash,baseSha:candidate.baseSha,patchDigest:hash(candidate.patch),checksDigest:hash(candidate.checks),expiresAt:candidate.expiresAt};
      job.proposalDigest = await this.files.artifact(Buffer.from(canonical(proposal)));
      job.state = 'awaiting_delivery'; await this.files.save(state); return job;
    });
  }
  private async proposal(job: Job): Promise<Proposal> {
    if (!job.proposalDigest) return blocked();
    const proposal = JSON.parse((await this.files.artifactBytes(job.proposalDigest)).toString()) as Proposal;
    if (proposal.candidateDigest !== job.candidateDigest || proposal.inputHash !== job.inputHash || proposal.channelId !== this.config.channelId || proposal.expiresAt <= Date.now()) return blocked();
    const receipt = JSON.parse((await this.files.artifactBytes(proposal.captureDigest)).toString());
    const capture = hostPayload(receipt,'atlas-linear-capture-v1',this.config.capturePublicKey,captureSchema);
    if (capture.candidateDigest !== job.candidateDigest || capture.before.digest !== proposal.beforeDigest || capture.after.digest !== proposal.afterDigest) return blocked();
    assertPng(await this.files.artifactBytes(proposal.beforeDigest),capture.before);
    assertPng(await this.files.artifactBytes(proposal.afterDigest),capture.after);
    return proposal;
  }
  async image(id: string, phase: 'before'|'after') {
    if (!['before','after'].includes(phase)) return blocked();
    const job = this.job(await this.files.read(), id), proposal = await this.proposal(job);
    return this.files.artifactBytes(phase === 'before' ? proposal.beforeDigest : proposal.afterDigest);
  }
  async delivered(id: string, receipt: unknown): Promise<Job> {
    return this.files.lock(async state => {
      try {
        const job = this.job(state,id), proposal = await this.proposal(job);
        await this.revalidate(job);
        if (job.state !== 'awaiting_delivery') return blocked();
        const delivery = hostPayload(receipt,'atlas-linear-review-delivery-v1',this.config.inputPolicy.hostPublicKey,deliverySchema);
        fresh(delivery.at);
        if (state.events[delivery.eventId] || delivery.channelId !== proposal.channelId || delivery.proposalDigest !== job.proposalDigest || delivery.beforeDigest !== proposal.beforeDigest || delivery.afterDigest !== proposal.afterDigest || delivery.messageIds[0] === delivery.messageIds[1]) return blocked();
        job.deliveryDigest = await this.files.artifact(Buffer.from(canonical(receipt)));
        state.events[delivery.eventId] = job.deliveryDigest;
        job.state = 'awaiting_review'; await this.files.save(state); return job;
      } catch {return blocked();}
    });
  }
  async decide(id: string, receipt: unknown): Promise<Job> {
    return this.files.lock(async state => {
      try {
        const decision = hostPayload(receipt,'atlas-linear-human-decision-v1',this.config.inputPolicy.hostPublicKey,decisionSchema);
        fresh(decision.at);
        const job = this.job(state,id);
        await this.revalidate(job); await this.proposal(job);
        if (!job.deliveryDigest || !['awaiting_review','approved','rejected','conflicted'].includes(job.state) || state.events[decision.eventId]) return blocked();
        const delivery = hostPayload(JSON.parse((await this.files.artifactBytes(job.deliveryDigest)).toString()),'atlas-linear-review-delivery-v1',this.config.inputPolicy.hostPublicKey,deliverySchema);
        if (decision.at < delivery.at || decision.channelId !== this.config.channelId || decision.threadId !== delivery.threadId || decision.proposalDigest !== job.proposalDigest || !this.config.reviewerIds.includes(decision.speakerId) || decision.messageId === delivery.threadId || delivery.messageIds.includes(decision.messageId)) return blocked();
        const digest = await this.files.artifact(Buffer.from(canonical(receipt)));
        state.events[decision.eventId] = digest;
        if (job.state !== 'awaiting_review') {
          // A second distinct decision is a conflict, even if it repeats the same choice.
          job.state = 'conflicted';
        } else {
          job.decisionDigest = digest; job.state = decision.decision === 'approve' ? 'approved' : 'rejected';
        }
        await this.files.save(state); return job;
      } catch {return blocked();}
    });
  }
  private async assertThread(state: State, job: Job) {
    if (!this.config.readReviewThread || !job.deliveryDigest || !job.decisionDigest || !job.proposalDigest) return blocked();
    const delivery = hostPayload(JSON.parse((await this.files.artifactBytes(job.deliveryDigest)).toString()),'atlas-linear-review-delivery-v1',this.config.inputPolicy.hostPublicKey,deliverySchema);
    const decision = hostPayload(JSON.parse((await this.files.artifactBytes(job.decisionDigest)).toString()),'atlas-linear-human-decision-v1',this.config.inputPolicy.hostPublicKey,decisionSchema);
    const request: ThreadRequest = {nonce:randomUUID(),requestedAt:Date.now(),channelId:this.config.channelId,threadId:delivery.threadId,proposalDigest:job.proposalDigest};
    const receipt = await this.config.readReviewThread(request);
    const thread = hostPayload(receipt,'atlas-linear-review-thread-v1',this.config.inputPolicy.hostPublicKey,threadSchema);
    fresh(thread.readAt,15000);
    if (hash(thread.request) !== hash(request) || thread.readAt < request.requestedAt || thread.messageCount !== thread.messages.length || new Set(thread.messages.map(m=>m.messageId)).size !== thread.messages.length) return blocked();
    for (const id of [delivery.threadId,...delivery.messageIds,decision.messageId]) if (!thread.messages.some(m=>m.messageId===id)) return blocked();
    const human = thread.messages.filter(m=>m.speakerType==='human');
    if (!human.some(m=>m.messageId===decision.messageId && m.speakerId===decision.speakerId) || human.some(m=>!this.config.reviewerIds.includes(m.speakerId) || m.text !== 'approve '+job.proposalDigest)) return blocked();
    // Fresh full-thread HOST readback is part of the durable authorization, not an old status.
    job.threadDigest = await this.files.artifact(Buffer.from(canonical(receipt))); await this.files.save(state);
  }
  async publish(id: string, options: {enabled?: boolean; signingKey: KeyLike; github: GitHubConfig}): Promise<Job> {
    if (options.enabled !== true) return blocked();
    this.enabled();
    return this.files.lock(async state => {
      const job = this.job(state,id);
      // Terminal/ambiguous attempts never silently resume remote writes, even after restart.
      if (job.state !== 'approved' || !job.decisionDigest || job.publication || job.bundleDigest) return blocked();
      const {candidate,sources} = await this.revalidate(job), proposal = await this.proposal(job);
      const approval = hostPayload(JSON.parse((await this.files.artifactBytes(job.decisionDigest)).toString()),'atlas-linear-human-decision-v1',this.config.inputPolicy.hostPublicKey,decisionSchema);
      await this.assertThread(state,job);
      if (approval.decision !== 'approve' || approval.proposalDigest !== job.proposalDigest || approval.channelId !== proposal.channelId || state.events[approval.eventId] !== job.decisionDigest || !this.config.reviewerIds.includes(approval.speakerId)) return blocked();
      const publicKey = createPublicKey(options.signingKey);
      if (publicKey.asymmetricKeyType !== 'ed25519') return blocked();
      const normalized = normalizeFeedback({...candidate.input.record.input,processingConsent:{approved:true,policyVersion:'atlas-feedback-simple-v1'}});
      const fence = ++state.fence;
      const receipt: Bundle['receipt'] = {policyVersion:'atlas-feedback-v1',jobId:randomUUID(),feedbackId:id,inputVersion:candidate.input.record.version,approvalHash:approvalHash(normalized.publicTask,normalized.publicContext),baseSha:candidate.baseSha,fence,patchDigest:hash(candidate.patch),checksDigest:hash(candidate.checks),expiresAt:Math.min(proposal.expiresAt,Date.now()+600000)};
      const bundle: Bundle = {receipt,signature:sign(null,Buffer.from(canonical(receipt)),options.signingKey).toString('base64'),publicTask:normalized.publicTask,publicContext:normalized.publicContext,patch:candidate.patch,checks:candidate.checks};
      verifyBundle(bundle,publicKey,sources);
      job.bundleDigest = await this.files.artifact(Buffer.from(canonical(bundle)));
      job.state = 'publishing'; job.fence = fence; await this.files.save(state);
      const active = async (b: Bundle) => {
        if (job.state !== 'publishing' || job.fence !== fence || state.fence !== fence || hash(await this.files.read()) !== hash(state) || hash(b) !== job.bundleDigest || !this.settled(state,id)) return blocked();
        await this.revalidate(job); const currentProposal = await this.proposal(job);
        const currentApproval = hostPayload(JSON.parse((await this.files.artifactBytes(job.decisionDigest!)).toString()),'atlas-linear-human-decision-v1',this.config.inputPolicy.hostPublicKey,decisionSchema);
        const delivery = hostPayload(JSON.parse((await this.files.artifactBytes(job.deliveryDigest!)).toString()),'atlas-linear-review-delivery-v1',this.config.inputPolicy.hostPublicKey,deliverySchema);
        if (hash(currentApproval) !== hash(approval) || currentApproval.decision !== 'approve' || currentApproval.threadId !== delivery.threadId || currentApproval.at < delivery.at || currentApproval.proposalDigest !== job.proposalDigest || delivery.proposalDigest !== job.proposalDigest || delivery.beforeDigest !== currentProposal.beforeDigest || delivery.afterDigest !== currentProposal.afterDigest || delivery.channelId !== this.config.channelId || state.events[delivery.eventId] !== job.deliveryDigest || state.events[currentApproval.eventId] !== job.decisionDigest) return blocked();
        verifyBundle(JSON.parse((await this.files.artifactBytes(job.bundleDigest!)).toString()),publicKey,sources);
        await this.assertThread(state,job);
      };
      try {
        const result = await publishBundle({enabled:true,bundle,publicKey,sources,github:options.github,store:{
          assertActive:active,
          open:async b=>{
            await active(b);
            if (job.publication) return blocked();
            job.publication = {branch:'atlas-feedback/'+id,version:b.receipt.inputVersion,candidateDigest:b.receipt.patchDigest,expectedHeadSha:null,commitSha:null,prNumber:null,phase:'reserved'};
            await this.files.save(state); return job.publication;
          },
          save:async (b,next)=>{
            await active(b);
            if (!job.publication || next.branch !== job.publication.branch || next.version !== job.publication.version || next.candidateDigest !== job.publication.candidateDigest) return blocked();
            job.publication = {...next}; await this.files.save(state);
          },
        }});
        await active(bundle);
        if ((job.publication as Publication | undefined)?.phase !== 'pr_ready') return blocked();
        job.result = result; job.state = 'published'; await this.files.save(state); return job;
      } catch {
        // Any uncertainty is terminal, not a new attempt. Keep the row, bundle and spend.
        job.state = 'parked'; job.reason = 'publication_failed_or_unknown'; await this.files.save(state); return blocked();
      }
    });
  }
  async prepare(): Promise<Job | {state: 'disabled'} | {state:'deferred';reason:'daily_attempt_quota'}> {
    if (this.config.enabled !== true) return {state: 'disabled'};
    this.enabled();
    if (this.config.provider === 'hermes-astra') new HermesAstraModel(this.config.model).assertAvailable();
    return this.files.lock(async state => {
      const input = await this.input(), id = input.record.feedbackId, base = await this.main();
      const existing = state.jobs[id] as Job | undefined;
      if (existing) {
        if (existing.state !== 'awaiting_capture' || existing.inputHash !== input.recordHash || !existing.candidateDigest) blocked();
        const candidate = JSON.parse((await this.files.artifactBytes(existing.candidateDigest!)).toString()) as Candidate;
        if (candidate.baseSha !== base || candidate.policyDigest !== this.policyDigest() || candidate.expiresAt <= Date.now()) blocked();
        return existing;
      }
      if (this.config.provider === 'hermes-astra') {
        const {budget}=this.config;
        if (state.attempts.some(row=>row.timeZone!==budget.timeZone || row.job===id)) blocked();
        const day=new Intl.DateTimeFormat('en-CA',{timeZone:budget.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()));
        // Known no-request deferral is not an ambiguous inference outcome. Leave no claim/fence.
        if (state.attempts.filter(row=>row.day===day).length>=budget.maxAttemptsPerDay) return {state:'deferred' as const,reason:'daily_attempt_quota' as const};
      }
      // A claim is written before subprocesses or inference. Crashes do not retry/spend again.
      const job: Job = {state: 'preparing', fence: ++state.fence, inputHash: input.recordHash};
      state.jobs[id] = job; await this.files.save(state);
      const signal = AbortSignal.timeout(this.config.maxWallMs), deadline = Date.now() + this.config.maxWallMs;
      const active = async () => {
        signal.throwIfAborted();
        if (Date.now() >= deadline || job.state !== 'preparing' || job.fence !== state.fence || (await this.input()).recordHash !== input.recordHash || await this.main() !== base) blocked();
      };
      try {
        await withCheckout(this.config.repo, base, true, async cwd => {
          await active();
          const sources = await loadSnapshot(cwd, base);
          const baseline = await runTrustedChecks(cwd, 'baseline', {timeoutMs: Math.min(this.config.maxWallMs, 300000), signal});
          await active();
          if (hash(await loadSnapshot(cwd, base)) !== hash(sources)) blocked();
          const simple = {...input.record.input, processingConsent: {approved: true as const, policyVersion: 'atlas-feedback-simple-v1' as const}};
          const normalized = normalizeFeedback(simple);
          const c = this.config;
          const modelInput = {baseSha: base, publicTask: normalized.publicTask, publicContext: normalized.publicContext, privateInstruction: normalized.privateInstruction, sources: Object.fromEntries(Object.entries(sources).filter(([p]) => (CSS_PATHS as readonly string[]).includes(p)))};
          const result = c.provider === 'hermes-astra' ? await new HermesAstraModel(c.model).generate(modelInput, {
            assertActive:active,
            reserve:async tokens=>{
              await active();
              if (!Number.isSafeInteger(tokens) || tokens < 1 || tokens > c.maxTokens) blocked();
              return this.files.reserveAttempt(state,{job:id,tokens,budget:c.budget,provider:c.provider,account:c.model.account,model:c.model.model,policyDigest:this.policyDigest()});
            },
            complete:async (reservation,usage)=>{
              await active(); const row = state.attempts.find(a=>a.id===reservation && a.job===id);
              if (!row || row.status !== 'reserved' || !Number.isSafeInteger(usage.inputTokens) || !Number.isSafeInteger(usage.outputTokens) || usage.inputTokens < 0 || usage.outputTokens < 0 || usage.inputTokens+usage.outputTokens > row.tokens) blocked();
              row!.status='completed';row!.usage=usage;await this.files.save(state);
            },
          },signal) : await new AnthropicModel(c.model, c.modelKey).generate(modelInput, {
            assertActive: active,
            reserve: async (upper, tokens) => {
              await active();
              const day = new Date().toISOString().slice(0, 10);
              const held = state.spend.filter(s => s.actual === undefined).reduce((n,s) => n + s.upper, 0);
              const today = state.spend.filter(s => s.actual !== undefined && s.day === day).reduce((n,s) => n + s.actual!, 0);
              if (state.spend.some(s => s.job === id) || !Number.isFinite(upper) || upper <= 0 || upper > c.maxJobUsd || held + today + upper > c.maxDayUsd || !Number.isSafeInteger(tokens) || tokens < 1 || tokens > this.config.maxTokens) throw new Error('budget');
              const reservation = {id: randomUUID(), day, job: id, upper, tokens};
              state.spend.push(reservation); await this.files.save(state); return reservation.id;
            },
            reconcile: async (reservation, actual) => {
              await active(); const spend = state.spend.find(s => s.id === reservation);
              if (!spend || !Number.isFinite(actual) || actual < 0 || actual > spend.upper || spend.actual !== undefined) blocked();
              spend!.actual = actual; await this.files.save(state);
            },
            unknown: async reservation => {if (!state.spend.some(s => s.id === reservation)) blocked(); await this.files.save(state);},
          }, signal);
          await active();
          if (!this.settled(state,id)) blocked();
          const patch = validatePatch(result.patch, sources, base, 'css-only');
          await applyValidatedPatch(cwd, patch, base);
          const candidate = await runTrustedChecks(cwd, 'candidate', {timeoutMs: Math.min(this.config.maxWallMs, 300000), signal});
          await active(); validatePatch(patch, sources, base, 'css-only'); await verifyAppliedPatch(cwd, patch);
          const preparedAt = Date.now();
          const artifact: Candidate = {schema: 1, revision: 1, input, baseSha: base, patch, checks: {baseline,candidate}, sourcesDigest: hash(sources), policyDigest: this.policyDigest(), preparedAt, expiresAt: preparedAt + this.config.proposalTtlMs};
          job.candidateDigest = await this.files.artifact(Buffer.from(canonical(artifact)));
          job.state = 'awaiting_capture'; await this.files.save(state);
        });
        return job;
      } catch {
        job.state = 'parked'; job.reason = 'preparation_failed_or_unknown'; await this.files.save(state); throw new Error('review_blocked');
      }
    });
  }
}
