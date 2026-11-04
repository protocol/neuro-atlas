import {createHash} from 'node:crypto';
import {createLinearIntake} from './intake';
import {z} from 'zod';
import {FeedbackError, invalid, unavailable} from '../../feedback/errors';
import {LINEAR_SCOPES, type LinearConfig, UUID} from './config';
import {seal, unseal, unauthorized} from './crypto';
import {createLinearProvider, type LinearProvider} from './provider';

const opaque = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const code = z.string().min(1).max(512).regex(/^[A-Za-z0-9_.-]+$/);
const startSchema = z.object({state:opaque, codeChallenge:opaque}).strict();
const finishSchema = z.object({state:opaque, code, codeVerifier:z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/), transaction:z.string().max(12000)}).strict();
const transactionSchema = z.object({state:opaque, challenge:opaque, expires:z.number().int(), origin:z.string()}).strict();
const sessionSchema = z.object({token:z.string().min(1).max(4096).regex(/^[A-Za-z0-9_.-]+$/), actorId:z.string().regex(UUID), workspaceId:z.string().regex(UUID), expires:z.number().int(), issued:z.number().int()}).strict();
const identitySchema = z.object({
  viewer:z.object({id:z.string(), name:z.string().min(1).max(200), active:z.boolean(), guest:z.boolean(), organization:z.object({id:z.string(),urlKey:z.string()})}),
  project:z.object({id:z.string(),archivedAt:z.null(),teams:z.object({nodes:z.array(z.object({id:z.string()})),pageInfo:z.object({hasNextPage:z.literal(false)})})}),
  team:z.object({id:z.string(),archivedAt:z.null(),organization:z.object({id:z.string()})}),
});
const IDENTITY = `query AtlasIdentity($projectId: String!, $teamId: String!) { viewer { id name active guest organization { id urlKey } } project(id: $projectId) { id archivedAt teams(first: 100) { nodes { id } pageInfo { hasNextPage } } } team(id: $teamId) { id archivedAt organization { id } } }`;
export type LinearActor = {linearId:string; workspaceId:string; login:string; token:string};
export type LinearService = ReturnType<typeof createLinearService>;
export function createLinearService(options: {config:LinearConfig; now?:()=>Date; provider?:LinearProvider}) {
  const {config} = options, now = options.now ?? (() => new Date()), provider = createLinearProvider(config, options.provider);
  async function identity(token: string): Promise<LinearActor> {
    const result = identitySchema.safeParse(await provider.graphql(token,'AtlasIdentity',IDENTITY,{projectId:config.projectId,teamId:config.teamId}));
    if (!result.success) return unavailable();
    const {viewer,project,team} = result.data;
    if (viewer.id !== config.ownerId || !viewer.active || viewer.guest || viewer.organization.id !== config.workspaceId || viewer.organization.urlKey !== config.workspaceKey || project.id !== config.projectId || !project.teams.nodes.some(t => t.id === config.teamId) || team.id !== config.teamId || team.organization.id !== config.workspaceId) throw new FeedbackError(403,'owner_required','Feedback is limited to its configured owner and workspace.');
    return {linearId:viewer.id, workspaceId:viewer.organization.id, login:viewer.name, token};
  }
  function session(value: string | null) {
    if (!value) return unauthorized();
    const s = unseal(config,'atlas-linear-session-v1',value,sessionSchema), current = now().getTime();
    if (s.actorId !== config.ownerId || s.workspaceId !== config.workspaceId || s.issued > current || s.expires <= current || s.expires - s.issued > 900000) return unauthorized();
    return s;
  }
  async function actor(value: string | null) {return identity(session(value).token);}
  return {
    config, actor,
    ...createLinearIntake(config,provider,now),
    async health() {return {enabled:true,connected:true,provider:'linear' as const,policyVersion:'atlas-feedback-linear-v1' as const};},
    async start(input: unknown) {
      const parsed = startSchema.safeParse(input); if (!parsed.success) return invalid();
      const {state,codeChallenge} = parsed.data, expires = now().getTime()+300000;
      const transaction = seal(config,'atlas-linear-transaction-v1',{state,challenge:codeChallenge,origin:config.origin,expires});
      const url = new URL(provider.urls.authorizeUrl);
      url.search = new URLSearchParams({client_id:config.clientId,redirect_uri:config.callbackUrl,response_type:'code',scope:LINEAR_SCOPES,actor:'user',state,code_challenge:codeChallenge,code_challenge_method:'S256'}).toString();
      return {authorizeUrl:url.href,expiresAt:new Date(expires).toISOString(),transaction,provider:'linear' as const};
    },
    async callback(state: string, value: string) {
      if (!opaque.safeParse(state).success || !code.safeParse(value).success) return invalid();
      // No transaction cookie/database. The opener verifies origin/source/state; finish verifies sealed proof and PKCE.
      return {type:'atlas-feedback-oauth',state,code:value};
    },
    async finish(input: unknown) {
      const parsed = finishSchema.safeParse(input); if (!parsed.success) return invalid();
      const {state,code,codeVerifier,transaction} = parsed.data;
      const proof = unseal(config,'atlas-linear-transaction-v1',transaction,transactionSchema);
      if (proof.state !== state || proof.origin !== config.origin || proof.expires <= now().getTime() || proof.expires > now().getTime()+300000 || proof.challenge !== createHash('sha256').update(codeVerifier).digest('base64url')) return invalid();
      const form = new URLSearchParams({client_id:config.clientId,grant_type:'authorization_code',code,code_verifier:codeVerifier,redirect_uri:config.callbackUrl,...(config.clientSecret?{client_secret:config.clientSecret}:{})});
      const parsedToken = z.object({access_token:sessionSchema.shape.token,token_type:z.string().regex(/^Bearer$/i),expires_in:z.number().int().positive(),scope:z.union([z.string(),z.array(z.string())])}).safeParse(await provider.json(provider.urls.tokenUrl,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:form}));
      if (!parsedToken.success) return unavailable();
      const token = parsedToken.data, scopes = Array.isArray(token.scope) ? token.scope : token.scope.split(/[ ,]+/);
      if (scopes.length !== 3 || new Set(scopes).size !== 3 || !LINEAR_SCOPES.split(',').every(s => scopes.includes(s))) return unavailable();
      const actor = await identity(token.access_token), issued = now().getTime(), expires = issued + Math.min(900000,token.expires_in*1000);
      return {session:seal(config,'atlas-linear-session-v1',{token:token.access_token,actorId:actor.linearId,workspaceId:actor.workspaceId,issued,expires}),expiresAt:new Date(expires).toISOString(),provider:'linear' as const,actor:{linearId:actor.linearId,workspaceId:actor.workspaceId,login:actor.login}};
    },
    async revoke(value: string) {
      const s = session(value); await identity(s.token);
      await provider.json(provider.urls.revokeUrl,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:s.token})});
      try {await identity(s.token);} catch (error) {if (error instanceof FeedbackError && error.status === 401) return; throw error;}
      return unavailable();
    },
  };
}
