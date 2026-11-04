export type FeedbackConfig = {
  origin: string; callbackUrl: string; clientId: string; clientSecret: string;
  ownerGithubId: number; databaseUrl: string; testMode: boolean;
};
export function isLoopbackUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) && !u.username && !u.password; }
  catch { return false; }
}
/** Anonymous UI gets only enabled/connected, never configuration diagnostics. */
export function loadFeedbackConfig(env: Record<string, string | undefined> = process.env): FeedbackConfig | null {
  if (env.FEEDBACK_ENABLED !== "true") return null;
  const testMode = env.FEEDBACK_TEST_MODE === "true" && env.NODE_ENV === "test" && !env.VERCEL && !env.VERCEL_ENV;
  const origin = env.FEEDBACK_PUBLIC_ORIGIN ?? "";
  try { if (new URL(origin).origin !== origin) return null; } catch { return null; }
  if (origin !== "https://www.plneuro.xyz" && !(testMode && isLoopbackUrl(origin))) return null;
  if (env.FEEDBACK_TEST_MODE === "true" && !testMode) return null;
  if (env.FEEDBACK_OWNER_GITHUB_ID !== "82394590") return null;
  const clientId = env.FEEDBACK_GITHUB_CLIENT_ID, clientSecret = env.FEEDBACK_GITHUB_CLIENT_SECRET;
  const databaseUrl = env.FEEDBACK_DATABASE_URL;
  if (!clientId?.trim() || !clientSecret?.trim() || !databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) return null;
  const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "/neuro-atlas";
  if (testMode ? !/^(?:\/[A-Za-z0-9_-]+)*$/.test(basePath) : basePath !== "/neuro-atlas") return null;
  return {origin, callbackUrl: `${origin}${basePath}/api/feedback/auth/callback`, clientId, clientSecret, ownerGithubId: 82394590, databaseUrl, testMode};
}
