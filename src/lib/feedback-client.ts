"use client";

import { atlasPath } from "./atlas-path";
import type { FeedbackSubmission, FeedbackSession, FeedbackStatus } from "./feedback/contracts";

import type { LinearFeedbackInput } from './feedback-linear/contracts';
export type FeedbackConfig = { enabled: boolean; connected: boolean; provider?: 'github' | 'linear'; policyVersion?: 'atlas-feedback-simple-v1' | 'atlas-feedback-linear-v1' };
export type FeedbackReceipt = Pick<FeedbackStatus, "id" | "state" | "version">;
export class FeedbackClientError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "FeedbackClientError"; }
}
const safeError = (status: number) => new FeedbackClientError(
  ({ 401: "auth_expired", 403: "disabled", 409: "conflict", 429: "limited" } as Record<number, string>)[status] ?? "unavailable",
  ({ 401: "Sign in again. Your feedback session expired.", 403: "Feedback is unavailable for this account or is disabled.", 409: "This feedback changed. Refresh its status before submitting again.", 413: "Your feedback is too long. Shorten it before retrying.", 429: "Feedback is temporarily limited. Keep your draft and try later." } as Record<number, string>)[status] ?? "Could not reach feedback. Your draft is still here; try again.",
);
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const sameState = (a: string, b: string) => {
  let difference = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) difference |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i);
  return difference === 0;
};

/** Page-memory only. Never set Authorization: it belongs to Atlas's existing Basic gate. */
export class FeedbackClient {
  private session: FeedbackSession | null = null;
  private cancelAuth?: () => void;
  private disposed = false;
  private provider: "github" | "linear" = "github";
  private readonly win: Window;
  private readonly crypto: Crypto;
  private readonly fetcher: typeof fetch;
  constructor(options: { window?: Window; crypto?: Crypto; fetch?: typeof fetch } = {}) {
    this.win = options.window ?? window;
    this.crypto = options.crypto ?? this.win.crypto;
    this.fetcher = options.fetch ?? this.win.fetch.bind(this.win);
  }
  getSession() {
    if (this.session && Date.parse(this.session.expiresAt) <= Date.now()) this.session = null;
    return this.session;
  }
  newKey() { return this.crypto.randomUUID(); }
  private async request<T>(suffix: string, method = "GET", body?: unknown, authenticated = false, key?: string, signal?: AbortSignal): Promise<T> {
    if (this.disposed) throw new FeedbackClientError("closed", "Feedback is closed.");
    const session = this.getSession();
    if (authenticated && !session) throw safeError(401);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (authenticated) headers["X-Atlas-Feedback-Session"] = session!.session;
    if (key) headers["Idempotency-Key"] = key;
    let response: Response;
    try {
      response = await this.fetcher(atlasPath(`/api/feedback${suffix}`), { method, headers, cache: "no-store", credentials: "same-origin", redirect: "error", body: body === undefined ? undefined : JSON.stringify(body), signal });
    } catch { throw safeError(503); }
    if (!response.ok) { if (response.status === 401) this.session = null; throw safeError(response.status); }
    if (authenticated && method === "POST" && response.status !== 202) throw new FeedbackClientError("invalid_response", "Could not confirm feedback was saved. Your draft is still here; retry.");
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; } catch { throw safeError(503); }
  }
  async config() {
    const result = await this.request<FeedbackConfig>("/config");
    if (typeof result.enabled !== "boolean" || typeof result.connected !== "boolean") throw safeError(503);
    if (result.provider !== undefined && result.provider !== 'github' && result.provider !== 'linear') throw safeError(503);
    if (result.provider === 'linear' && result.policyVersion !== 'atlas-feedback-linear-v1') throw safeError(503);
    if (result.provider !== 'linear' && result.policyVersion !== undefined && result.policyVersion !== 'atlas-feedback-simple-v1') throw safeError(503);
    this.provider = result.provider ?? 'github';
    return result;
  }
  list() { return this.request<{ items: FeedbackStatus[] }>("?limit=20", "GET", undefined, true); }
  status(id: string) { return this.request<FeedbackStatus>(`/${encodeURIComponent(id)}`, "GET", undefined, true); }
  private async receipt(request: Promise<FeedbackReceipt>) {
    const value = await request;
    if (!value || typeof value.id !== "string" || !value.id || !Number.isSafeInteger(value.version) || value.version < 1 || typeof value.state !== "string") {
      throw new FeedbackClientError("invalid_response", "Could not confirm feedback was saved. Your draft is still here; retry.");
    }
    return value;
  }
  submit(input: FeedbackSubmission | LinearFeedbackInput, key: string) { return this.receipt(this.request<FeedbackReceipt>("", "POST", input, true, key)); }
  followup(id: string, expectedVersion: number, input: FeedbackSubmission | LinearFeedbackInput, key: string) {
    return this.receipt(this.request<FeedbackReceipt>(`/${encodeURIComponent(id)}/followups`, "POST", { ...input, expectedVersion }, true, key));
  }
  async signOut() {
    try { if (this.getSession()) await this.request("/auth/session", "DELETE", undefined, true); }
    finally { this.session = null; this.cancelSignIn(); }
  }
  cancelSignIn() { this.cancelAuth?.(); }
  private discardSession(session: FeedbackSession | null) {
    if (session?.provider !== 'linear' || typeof session.session !== 'string' || !session.session) return;
    // Best-effort upstream revocation even after disposal/abort; never restore page memory.
    void this.fetcher(atlasPath('/api/feedback/auth/session'), {method:'DELETE', headers:{Accept:'application/json', 'X-Atlas-Feedback-Session':session.session}, cache:'no-store', credentials:'same-origin', redirect:'error', keepalive:true, signal:AbortSignal.timeout(8000)}).catch(() => {});
  }
  dispose() { this.disposed = true; this.cancelSignIn(); this.discardSession(this.session); this.session = null; }

  /** Must be called directly by the click handler: open BEFORE crypto/network awaits. */
  signIn(): Promise<FeedbackSession> {
    if (this.disposed) return Promise.reject(new FeedbackClientError("closed", "Feedback is closed."));
    this.cancelSignIn();
    const popup = this.win.open("about:blank", "atlas-feedback-signin", "popup,width=520,height=700");
    if (!popup) return Promise.reject(new FeedbackClientError("popup_blocked", "Allow the sign-in popup, then try again."));
    const origin = this.win.location.origin, provider = this.provider;
    const controller = new AbortController();
    return new Promise((resolve, reject) => {
      let state = "", verifier = "", transaction = "", consumed = false, settled = false;
      const cleanup = () => {
        this.win.removeEventListener("message", message);
        clearInterval(timer);
        this.cancelAuth = undefined;
        popup.close();
        state = ""; verifier = ""; transaction = "";
      };
      const fail = (error: unknown) => { if (settled) return; settled = true; controller.abort(); cleanup(); reject(error); };
      const message = (event: MessageEvent) => {
        if (consumed || !state || event.origin !== origin || event.source !== popup || !event.data || event.data.type !== "atlas-feedback-oauth" || typeof event.data.state !== "string" || !sameState(event.data.state, state) || typeof event.data.code !== "string" || !event.data.code || event.data.code.length > 512) return;
        consumed = true;
        this.win.removeEventListener("message", message);
        // Keep the transaction timer alive while finish is in flight too.
        void this.request<FeedbackSession>("/auth/finish", "POST", { state, code: event.data.code, codeVerifier: verifier, ...(provider === "linear" ? {transaction} : {}) }, false, undefined, controller.signal).then(session => {
          if (settled) { this.discardSession(session); return; }
          if (!session || typeof session.session !== "string" || !session.session || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now() || !(provider === 'linear' ? session.provider === 'linear' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(session.actor?.linearId ?? '') && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(session.actor?.workspaceId ?? '') : session.provider !== 'linear' && Number.isSafeInteger(session.actor?.githubId)) || typeof session.actor?.login !== "string" || !session.actor.login) { fail(safeError(503)); return; }
          this.session = session; settled = true; cleanup(); resolve(session);
        }).catch(fail);
      };
      this.cancelAuth = () => fail(new FeedbackClientError("auth_cancelled", "Sign-in cancelled. Your draft is still here."));
      this.win.addEventListener("message", message);
      const deadline = Date.now() + 300000;
      const timer = setInterval(() => {
        if (Date.now() >= deadline) fail(new FeedbackClientError("auth_expired", "Sign-in expired. Try again."));
        else if (!consumed && popup.closed) this.cancelSignIn();
      }, 250);
      void (async () => {
        state = base64url(this.crypto.getRandomValues(new Uint8Array(32)));
        verifier = base64url(this.crypto.getRandomValues(new Uint8Array(32)));
        const challenge = base64url(new Uint8Array(await this.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
        if (settled) return;
        const start = await this.request<{ authorizeUrl: string; expiresAt: string; transaction?: string; provider?: string }>("/auth/start", "POST", { state, codeChallenge: challenge }, false, undefined, controller.signal);
        if (settled) return;
        const url = new URL(start.authorizeUrl);
        const expected = provider === 'linear' ? ['https://linear.app', '/oauth/authorize'] : ['https://github.com', '/login/oauth/authorize'];
        // Test provider URLs are server-only. The actual browser always visits fixed Linear/GitHub.
        if (url.origin !== expected[0] || url.pathname !== expected[1] || url.username || url.password || url.hash || url.searchParams.get('state') !== state || url.searchParams.get('code_challenge') !== challenge || url.searchParams.get('code_challenge_method') !== 'S256') throw safeError(503);
        if (provider === 'linear') {
          if (start.provider !== 'linear' || typeof start.transaction !== 'string' || !/^[A-Za-z0-9_-]{40,2000}$/.test(start.transaction) || !Number.isFinite(Date.parse(start.expiresAt)) || Date.parse(start.expiresAt) <= Date.now() || Date.parse(start.expiresAt) > Date.now()+300000 || [...new Set(url.searchParams.keys())].some(k=>url.searchParams.getAll(k).length!==1) || url.searchParams.get('scope') !== 'read,issues:create,comments:create' || url.searchParams.get('actor') !== 'user' || url.searchParams.get('response_type') !== 'code' || url.searchParams.has('client_secret')) throw safeError(503);
          transaction = start.transaction;
        }
        popup.location.href = url.href;
      })().catch(fail);
    });
  }
}
