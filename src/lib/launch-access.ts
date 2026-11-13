import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Thursday, November 19, 2026 at 9 a.m. America/New_York (EST). */
export const ATLAS_LAUNCH_AT = Date.parse("2026-11-19T14:00:00Z");
export const PREVIEW_COOKIE_NAME = "__Secure-atlas-preview";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function sessionMac(expiry: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(expiry).digest();
}

/** Hash to equal-length buffers before comparison; never log supplied credentials. */
export function matchesPassword(supplied: string, secret: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(secret).digest(),
  );
}

export function hasBasicAccess(header: string | null, secret: string): boolean {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header ?? "");
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[1], "base64");
    if (bytes.toString("base64") !== match[1]) return false;
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const colon = decoded.indexOf(":");
    return colon >= 0 && matchesPassword(decoded.slice(colon + 1), secret);
  } catch {
    return false;
  }
}

export function hasPreviewCookie(header: string | null, secret: string, now: number): boolean {
  const matches = (header ?? "").split(";")
    .map((part) => part.trim())
    .filter((part) => part.split("=", 1)[0].trim() === PREVIEW_COOKIE_NAME);
  if (matches.length !== 1) return false;
  const value = matches[0].slice(matches[0].indexOf("=") + 1);
  return verifyPreviewToken(value, secret, now);
}

/** Keep the original URL (including its fragment) only within this app's mount. */
export function safeReturnTo(value: string | null, basePath: string): string {
  const fallback = basePath || "/";
  if (!value || value.length > 2048 || !value.startsWith("/") || /[\x00-\x20\x7f\\]/.test(value)) return fallback;
  let decoded = value;
  let path = value.split(/[?#]/, 1)[0];
  try {
    // Decode defensively so nested escapes cannot hide controls, traversal, or a host.
    for (let depth = 0; depth < 5; depth++) {
      if (/[\x00-\x1f\x7f\\]/.test(decoded) || path.startsWith("//")
        || /[?#\\]/.test(path) || path.split("/").some((part) => part === "." || part === "..")) return fallback;
      // Reject encoded slash runs as well as protocol-relative destinations.
      if (path.includes("//")) return fallback;
      const next = decodeURIComponent(decoded);
      const nextPath = decodeURIComponent(path);
      if (next === decoded && nextPath === path) {
        return !basePath || path === basePath || path.startsWith(`${basePath}/`) ? value : fallback;
      }
      decoded = next;
      path = nextPath;
    }
  } catch {
    // Malformed percent escapes or UTF-8 never become a redirect target.
  }
  return fallback;
}

/** Forwarded host/proto are not trusted configuration and cannot widen this set. */
export function isAllowedAuthOrigin(req: Request, canonicalOrigin?: string): boolean {
  const origin = req.headers.get("origin");
  return origin !== null && (origin === new URL(req.url).origin || origin === canonicalOrigin);
}

const AUTH_BODY_MAX_BYTES = 4096;

export async function readAuthForm(req: Request): Promise<{ password: string; returnTo: string } | null> {
  if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(req.headers.get("content-type") ?? "")) return null;
  const length = req.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > AUTH_BODY_MAX_BYTES)) return null;
  if (!req.body) return null;
  const reader = req.body.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > AUTH_BODY_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    const fields = new Map<string, string>();
    for (const part of body.split("&")) {
      const equals = part.indexOf("=");
      if (equals < 0) return null;
      const name = decodeURIComponent(part.slice(0, equals).replace(/\+/g, " "));
      const value = decodeURIComponent(part.slice(equals + 1).replace(/\+/g, " "));
      if (!["password", "returnTo"].includes(name) || fields.has(name)) return null;
      fields.set(name, value);
    }
    const password = fields.get("password");
    const returnTo = fields.get("returnTo");
    return password && returnTo !== undefined ? { password, returnTo } : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/** The proxy checks Origin before parsing; tests exercise this with synthetic secrets. */
export async function authenticatePreviewForm(req: Request, secret: string | undefined, now: number, basePath: string): Promise<{
  response: Response | null; returnTo: string;
}> {
  const form = await readAuthForm(req);
  const returnTo = safeReturnTo(form?.returnTo ?? null, basePath);
  if (!form || !secret || !matchesPassword(form.password, secret)) return { response: null, returnTo };
  const token = createPreviewToken(secret, now);
  const expiry = Number(token.split(".")[0]);
  const cookie = `${PREVIEW_COOKIE_NAME}=${token}; Path=${basePath || "/"}; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expiry - now) / 1000)}; Expires=${new Date(expiry).toUTCString()}`;
  // The proxy has already validated Origin. Use that public origin across the
  // external rewrite; Next requires an absolute Location, not a relative path.
  const location = new URL(returnTo, req.headers.get("origin") ?? req.url).href;
  return {
    returnTo,
    response: new Response(null, { status: 303, headers: { Location: location, "Set-Cookie": cookie } }),
  };
}

export function createPreviewToken(secret: string, now: number): string {
  const expiry = String(Math.min(now + SESSION_MAX_AGE_MS, ATLAS_LAUNCH_AT));
  return `${expiry}.${sessionMac(expiry, secret).toString("hex")}`;
}

export function verifyPreviewToken(token: string, secret: string, now: number): boolean {
  if (!/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, signature] = token.split(".");
  const expiresAt = Number(expiry);
  if (expiresAt <= now || expiresAt > ATLAS_LAUNCH_AT || expiresAt > now + SESSION_MAX_AGE_MS) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), sessionMac(expiry, secret));
}
