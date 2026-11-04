import {FeedbackError, unavailable} from '../../feedback/errors';
import {isLoopbackUrl} from '../../feedback/config';
import type {LinearConfig} from './config';
import {unauthorized} from './crypto';

export type LinearProvider = {authorizeUrl: string; tokenUrl: string; revokeUrl: string; graphqlUrl: string};
export function createLinearProvider(config: LinearConfig, override?: LinearProvider) {
  if (override && (!config.testMode || !Object.entries(override).every(([key,url]) => isLoopbackUrl(url) || (key === 'authorizeUrl' && url === 'https://linear.app/oauth/authorize')))) throw new Error('Provider overrides are local-test only');
  const urls = override ?? {authorizeUrl:'https://linear.app/oauth/authorize', tokenUrl:'https://api.linear.app/oauth/token', revokeUrl:'https://api.linear.app/oauth/revoke', graphqlUrl:'https://api.linear.app/graphql'};
  async function json(url: string, init: RequestInit): Promise<unknown> {
    try {
      const r = await fetch(url, {...init, redirect:'error', signal:AbortSignal.timeout(8000), cache:'no-store'});
      if (r.status === 401) return unauthorized();
      if (!r.ok) return unavailable();
      const reader = r.body?.getReader(); if (!reader) return unavailable();
      const chunks: Uint8Array[] = []; let bytes = 0;
      for (;;) {const {done,value} = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 524288) {await reader.cancel(); return unavailable();} chunks.push(value);}
      return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks)));
    } catch (error) {if (error instanceof FeedbackError) throw error; return unavailable();}
  }
  async function graphql(token: string, operationName: string, query: string, variables: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const result = await json(urls.graphqlUrl, {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json', Authorization:`Bearer ${token}`}, body:JSON.stringify({operationName, query, variables})});
    if (!result || typeof result !== 'object') return unavailable();
    const response = result as {errors?: {extensions?: {code?: string}}[]; data?: Record<string, unknown>};
    if (response.errors !== undefined) {
      if (!Array.isArray(response.errors)) return unavailable();
      if (response.errors.some(e => ['UNAUTHENTICATED','AUTHENTICATION_ERROR'].includes(e?.extensions?.code ?? ''))) return unauthorized();
      if (response.errors.length) return unavailable();
    }
    if (!response.data || typeof response.data !== 'object') return unavailable();
    return response.data;
  }
  return {urls, json, graphql};
}
