'use client';
import {atlasPath} from './atlas-path';
import type {PublicFeedbackConfig, PublicFeedbackInput, PublicFeedbackReceipt} from './feedback-public/contracts';

export class PublicFeedbackError extends Error {}
const unavailable = () => new PublicFeedbackError('Could not confirm feedback was saved. Your draft is still here; try again.');
const safeError = (status: number) => new PublicFeedbackError(({400:'Feedback could not be accepted. Your draft is still here; check it before retrying.',409:'Could not confirm this feedback. Your draft is still here; retry the unchanged note or contact the site team.',413:'Feedback is too long. Your draft is still here; shorten it before retrying.',429:'Feedback is temporarily limited. Your draft is still here; try again shortly.'} as Record<number, string>)[status] ?? unavailable().message);

export class PublicFeedbackClient {
  private readonly win: Window;
  private readonly requests = new Set<AbortController>();
  private disposed = false;
  dispose() {this.disposed = true; for (const controller of this.requests) controller.abort();}
  constructor(options: {window?: Window} = {}) {this.win = options.window ?? window;}
  newKey() {return this.win.crypto.randomUUID();}
  private async request(suffix: string, input?: PublicFeedbackInput, key?: string): Promise<unknown> {
    if (this.disposed) throw unavailable();
    const controller = new AbortController(); this.requests.add(controller);
    const timer = setTimeout(() => controller.abort(), 15000);
    const aborted = new Promise<never>((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(unavailable()), {once:true}));
    try {
      return await Promise.race([aborted, (async () => {
        const response = await this.win.fetch(atlasPath(`/api/feedback/public${suffix}`), {
          method:input ? 'POST' : 'GET', headers:{Accept:'application/json', ...(input ? {'Content-Type':'application/json', 'Idempotency-Key':key!} : {})},
          // The existing site Basic Auth uses same-origin credentials. No feedback
          // identity/cookie is created or required, and Authorization is never set here.
          credentials:'same-origin', redirect:'error', cache:'no-store', signal:controller.signal, ...(input ? {body:JSON.stringify(input)} : {}),
        });
        if (!response.ok) throw safeError(response.status);
        if (response.status !== (input ? 202 : 200)) throw unavailable();
        return await response.json();
      })()]);
    } catch (error) {throw error instanceof PublicFeedbackError ? error : unavailable();}
    finally {clearTimeout(timer); this.requests.delete(controller);}
  }
  async config(): Promise<PublicFeedbackConfig> {
    const value = await this.request('/config') as Partial<PublicFeedbackConfig> | null;
    if (!value || typeof value.enabled !== 'boolean' || typeof value.connected !== 'boolean' || Object.keys(value).length !== 2) throw unavailable();
    return {enabled:value.enabled, connected:value.connected};
  }
  async submit(input: PublicFeedbackInput, key: string): Promise<PublicFeedbackReceipt> {
    const value = await this.request('', input, key) as Partial<PublicFeedbackReceipt> | null;
    if (!value || value.saved !== true || Object.keys(value).length !== 1) throw unavailable();
    return {saved:true};
  }
}
