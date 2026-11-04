import {isLoopbackUrl} from '../../feedback/config';

export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const LINEAR_SCOPES = 'read,issues:create,comments:create';
export type LinearConfig = {
  origin: string; callbackUrl: string; clientId: string; clientSecret?: string;
  ownerId: string; workspaceId: string; workspaceKey: string; projectId: string; teamId: string;
  sessionKey: string; testMode: boolean;
};
/** No database, defaults to OFF. Audit is an operator attestation, not a provider proof. */
export function loadLinearConfig(env: Record<string, string | undefined> = process.env): LinearConfig | null {
  if (env.FEEDBACK_ENABLED !== 'true' || env.FEEDBACK_BACKEND !== 'linear' || env.FEEDBACK_LINEAR_SYNC_AUDIT !== 'ordinary-comments-isolated-v1') return null;
  const testMode = env.FEEDBACK_TEST_MODE === 'true' && env.NODE_ENV === 'test' && !env.VERCEL && !env.VERCEL_ENV;
  if (env.FEEDBACK_TEST_MODE === 'true' && !testMode) return null;
  const origin = env.FEEDBACK_PUBLIC_ORIGIN ?? '';
  try { if (new URL(origin).origin !== origin) return null; } catch { return null; }
  const branchHost = env.VERCEL_BRANCH_URL ?? '';
  const literalHostname = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(branchHost);
  const exactPreview = env.VERCEL_ENV === 'preview' && literalHostname && origin === `https://${branchHost}`;
  if (origin !== 'https://www.plneuro.xyz' && !exactPreview && !(testMode && isLoopbackUrl(origin))) return null;
  const basePath = env.NEXT_PUBLIC_BASE_PATH ?? '/neuro-atlas';
  if (testMode ? !/^(?:\/[A-Za-z0-9_-]+)*$/.test(basePath) : basePath !== '/neuro-atlas') return null;
  const ownerId = env.FEEDBACK_LINEAR_OWNER_ID ?? '', workspaceId = env.FEEDBACK_LINEAR_WORKSPACE_ID ?? '';
  const projectId = env.FEEDBACK_LINEAR_PROJECT_ID ?? '', teamId = env.FEEDBACK_LINEAR_TEAM_ID ?? '';
  if (![ownerId, workspaceId, projectId, teamId].every(id => UUID.test(id))) return null;
  const workspaceKey = env.FEEDBACK_LINEAR_WORKSPACE_KEY ?? '', clientId = env.FEEDBACK_LINEAR_CLIENT_ID ?? '', sessionKey = env.FEEDBACK_LINEAR_SESSION_KEY ?? '';
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(workspaceKey) || !/^[A-Za-z0-9_-]{1,200}$/.test(clientId)) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(sessionKey) || Buffer.from(sessionKey, 'base64url').length !== 32 || Buffer.from(sessionKey, 'base64url').toString('base64url') !== sessionKey) return null;
  const clientSecret = env.FEEDBACK_LINEAR_CLIENT_SECRET;
  if (clientSecret !== undefined && !/^[A-Za-z0-9_.-]{1,4096}$/.test(clientSecret)) return null;
  return {origin, callbackUrl: `${origin}${basePath}/api/feedback/auth/callback`, clientId, ...(clientSecret ? {clientSecret} : {}), ownerId, workspaceId, workspaceKey, projectId, teamId, sessionKey, testMode};
}
