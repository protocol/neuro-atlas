# Neuro Atlas launch access

## Release contract

- Public opening: **Thursday, November 19, 2026, 9:00 a.m. America/New_York (EST)**, exactly `2026-11-19T14:00:00Z`.
- `ATLAS_LAUNCH_AT` is exported by `src/lib/launch-access.ts` for the server and standalone gate renderer.
- The proxy compares the server's `Date.now()` with that instant on every request. At or after opening, all requests pass through without requiring Basic authentication or a preview cookie. No rebuild, scheduled deployment, browser clock, query parameter, or unsigned client flag controls access.
- Before opening, the explicit root and catch-all matchers protect **all** routes, public files, Next JavaScript/data bundles, image optimization, API calls, RSC, prefetches, and Server Action requests. No static-file exemptions remain.

## Before launch

A document `GET` that accepts HTML receives only `renderLaunchGate({ now, nonce, returnTo, basePath, error })`: a self-contained `401` HTML response, not an Atlas render and not an Atlas client bundle. It deliberately omits `WWW-Authenticate` to avoid the native browser password dialog.

Non-document/resource requests receive a plain-text `401` with the existing Basic challenge. RSC/router/action headers and asset/API paths never receive the HTML entry screen as if it were a document. A supplied valid Basic credential still works with any username, but the colon separator, strict base64, and exact password are required. Credential comparison uses equal-length SHA-256 digests and `timingSafeEqual`.

The owner requested a password rotation after the initial review. `src/proxy.ts` now reads only the server-side **`ATLAS_PREVIEW_PASSWORD`** deployment secret; the former hardcoded credential is removed. The new value must be supplied through the owner's secure Connections token entry and configured as a Vercel Secret for this project's preview and production environments—never committed, repeated in a reply, or written into notes. Missing/empty configuration fails closed before launch (no Basic/cookie/password access); the public launch boundary still opens normally. Tests use only explicit synthetic credentials. Rotating the secret also invalidates previously signed preview sessions.

All prelaunch proxy responses—including authenticated pass-throughs and successful login redirects—are `private, no-store, max-age=0`, `noindex, nofollow, noarchive`, `nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: same-origin`. Gate HTML adds a fresh cryptographic nonce for inline scripts/styles and a CSP with `default-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, and no network connections. Eventual site-wide indexing configuration remains separate.

## Native form and signed preview session

The proxy intercepts `POST <basePath>/__launch/auth` before rendering/routing. The form uses `application/x-www-form-urlencoded` fields `password` and `returnTo`; it works without JavaScript. The renderer's enhancement adds the current fragment to the hidden return destination because URL fragments do not reach the server.

Before parsing credentials, the proxy requires an exact `Origin` match with either:

1. the request URL's origin, or
2. the canonical origin configured through validated `ATLAS_SITE_URL`.

This handles PLNeuro's external rewrite to a different Atlas deployment hostname without trusting caller-supplied `Host`, `X-Forwarded-Host`, or `X-Forwarded-Proto` to widen the allowlist. Missing, `null`, malformed, or foreign origins receive `403`. The gate deliberately uses `Referrer-Policy: same-origin`: Chromium native forms can emit `Origin: null` under `no-referrer`, breaking an otherwise legitimate password POST. The same-origin policy fixes native submission without allowing null origins or relaxing the allowlist. For local browser QA, use the exact hostname that Next puts in the request URL; Next dev may normalize `127.0.0.1` to `localhost`.

The parser rejects wrong media types, malformed UTF-8/percent encoding, duplicate or unknown fields, absent/empty passwords, malformed content length, and bodies over **4,096 bytes**, including streamed bodies without a useful content-length header. Invalid credentials/forms redisplay a generic gate error without echoing the password or issuing a cookie.

Correct credentials return a **303** with an absolute `Location` on the already-validated public Origin, preserving the same-mount destination, and one cookie:

- Name: `__Secure-atlas-preview`
- Value: `<13-digit-expiry-ms>.<64-lowercase-hex-HMAC-SHA256>`
- Signature input: the exact expiry string; key: the server-only `ATLAS_PREVIEW_PASSWORD`
- Lifetime: at most 24 hours, capped at the public opening instant
- Attributes: `HttpOnly; Secure; SameSite=Lax; Path=<basePath-or-/>`, explicit `Max-Age` and `Expires`; no broad `Domain`

The raw Cookie header is checked to reject duplicate preview cookies before parsing a value. Strict shape, expiry, launch cap, and maximum-lifetime checks precede constant-time signature comparison. Unsigned flags, tampered signatures, expired sessions, uppercase/noncanonical signatures, and extra token suffixes never authorize a request.

`returnTo` preserves the requested path, query, and submitted hash only within the current mount. Absolute/protocol-relative URLs, backslashes, control characters, traversal/dot segments, malformed escapes, encoded unsafe paths, and cross-mount destinations fall back to the mount root. Nested encodings are checked defensively. The proxy validates Origin before the helper uses it to construct an absolute redirect; it never derives the public destination from a forwarded host. A real positive Next/host fixture caught that relative Location values cause Next's proxy adapter to throw `Invalid URL`; the regression test and absolute public-origin construction fixed that failure.

## Host integration and deployment checks

The PLNeuro host currently strips cookies on its external rewrite. Its companion change must forward only the exact syntactically valid `__Secure-atlas-preview` cookie (`13 digits`, a dot, `64 lowercase hex characters`) while preserving Authorization. The Atlas origin remains responsible for the HMAC and expiry checks; syntax at the host is not authorization. Do not forward all owner cookies. Verify the successful `Set-Cookie` response survives the host too.

Parent-owned release QA should verify the actual public mount with a successful native password login (including JavaScript disabled), cookie-backed document/JS/API requests, Basic access, wrong-password retry, hash restoration, and the server-time release boundary. Local synthetic-helper tests cannot prove cookie forwarding through the production external rewrite.

Installed Next **16.4.1** proxy docs were inspected before implementation: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` documents the Node runtime, async proxy, direct responses, static matcher analysis, and execution before route/static rendering. The parent subsequently updated the workspace to Next **16.4.6**; focused verification below uses that installation.

## TDD and verification evidence

Tests were added in vertical red/green slices before their corresponding implementation. Observed red failures included the missing session helper module, acceptance of a token with an extra suffix, missing cookie/Basic/redirect/origin/form helpers, an unbounded/malformed form accepted by the initial parser, static assets excluded from the matcher, a native Basic challenge on HTML, HTML returned to asset requests, failure to open at the launch boundary, and missing native form/Origin interception. Every slice was rerun green before proceeding.

Focused commands:

```sh
node --import tsx --test tests/auth-prefix.test.mjs tests/launch-access.test.mjs tests/launch-proxy.test.mjs tests/response-robots.test.mjs tests/launch-gate.test.mjs
node_modules/.bin/eslint src/proxy.ts src/lib/launch-access.ts
node_modules/.bin/tsc --noEmit --incremental false
```

Final focused replay: **26 tests passed, 0 failed, 0 cancelled**. ESLint for both auth implementation files, `tsc --noEmit --incremental false`, and `git diff --check` exited 0. The native-form Referrer-Policy regression was separately observed red (`no-referrer` versus expected `same-origin`) and green after fixing the header, with **5 proxy tests passed**. Browser behavior itself is verified by the parent, not simulated by these unit tests.

`response-robots.test.mjs` was also migrated from a synchronous proxy call to `await proxy(...)`, with a pinned prelaunch server clock and the new unconditional launch-denial noindex policy. A search of test proxy invocations found no remaining synchronous callers.

A duplicate `npm test` attempt hit its **180-second tool timeout**, reporting 447 passes, zero assertion failures, and 119 cancelled tests; that interrupted run is **not** a full-suite pass. The parent owns the final uninterrupted full replay, production build, native-browser verification, and review. No commit, push, PR, merge, production deployment, or build was performed by this auth worker.
