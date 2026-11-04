# Astra subscription/count mode — native helper implemented, application OFF

**Do not activate.** `astra_native.py` is an executable existing-Hermes native no-tools completion helper, not a fixture-only adapter. The TypeScript/controller still deliberately holds with `hermes_astra_bounded_broker_unavailable` until parent wiring and independent review. No scheduler, service, account, credential, deployment, provider switch, profile or global Hermes changes were made.

## Reviewed safety/budget contract

- The selected budget is **existing Astra + at most5 durable attempts/day**, not dollars or a generation-token guarantee. The existing controller's durable reserve-before-effect ledger remains authoritative. The helper is not a standalone daily-quota service: parent wiring must call it only after that reservation and never refund/retry an ambiguous attempt.
- **Production completion explicitly omits `max_output_tokens`. No server-enforced generation-token cap is claimed.** Platform review says that cap cannot be relied on for this native subscription endpoint. A cap echo is not independent proof of enforcement. The official [Responses create reference](https://developers.openai.com/api/reference/resources/responses/methods/create) defines generic API semantics including reasoning tokens, but that does not override the native platform capability decision.
- Fixed `openai-codex` native broker/default account route, fixed requested `gpt-6-astra`, no automatic fallback, no custom endpoint or credential handling. Existing native broker selection is route evidence, **not** a demand for an impossible new cryptographic account receipt. Check the actual server model when returned; never stamp the requested model as a server fact.
- Input/body/raw-response/wall bounds, one direct no-tools completion, `store:false`, partial/unknown fail-closed, CSS-only validation, genuine before/after checks, and private human approval remain. Prices are **UNPRICED / null**, never zero or invented.

## Exactly one real public smoke — 2026-11-04T21:10:43Z

After offline execution of the actual raw resolver/SDK emitted-request path, current docs/source review, live model catalog and `hermes auth status openai-codex` → `openai-codex: logged in`, the one authorized request ran with fixed public text `Public transport diagnostic.`, instruction `Reply with exactly OK.`, requested cap128, retries0, tools[] / choice none. No private feedback, source, memory, skills, tools, agents or conversation history was sent. No second, uncapped or private smoke ran.

Actual sanitized result:

```json
{"accountIdentity":"NATIVE_BROKER_SELECTED_NOT_SERVER_ATTESTED","authRoute":"native-hermes-openai-codex","chargedUsd":null,"pricing":"UNPRICED","serverMaxOutputTokens":128,"serverModel":"gpt-6-astra","status":"completed","text":"","usage":{"inputTokens":19,"outputTokens":5}}
```

Model, cap echo, status and usage above came from the real server. Local `authRoute` / `accountIdentity` are explicitly not server-returned identity. This proves native request acceptance, model and usage—not generation-cap enforcement/exhaustion. **Do not claim “OK” was returned**: the first collector's terminal response yielded no text and it did not retain text deltas. Delta-only recovery was then implemented against actual SDK/HTTP synthetic peers; it was not followed by another real inference. Native real-content/JSON-CSS acceptance remains pending; no private inference is authorized here.

Private local evidence: `/opt/data/tmp/atlas-astra-public-smoke-20261104.json`, empty `.stderr`, exclusive `.started` marker, and final no-inference helper preflight `/opt/data/tmp/atlas-astra-native-preflight-final.json`. The marker is only this diagnostic’s once-only record, not the durable workflow quota ledger. **Do not rerun `--public-smoke` under the spent one-smoke approval.**

## Supported native path and exact parent API

Current [Hermes provider docs](https://hermes-agent.nousresearch.com/docs/integrations/providers) identify the ChatGPT OAuth subscription route. Installed `agent/auxiliary_client.py:6515–6555,6760–6783` documents and implements `resolve_provider_client('openai-codex', model='gpt-6-astra', raw_codex=True)`; the main agent uses that same supported raw path. Our helper never opens an auth store, reads a token/header, exports credentials or changes settings. It verifies the resolver's fixed endpoint `https://chatgpt.com/backend-api/codex` and model before effect. Native SDK2.24.0 retries are disabled. The [subscription proxy](https://hermes-agent.nousresearch.com/docs/user-guide/features/subscription-proxy) still exposes only nous/xai and is not used.

```sh
# Read-only/no-inference native auth-route resolution; no credential values printed.
/opt/hermes/.venv/bin/python -B scripts/feedback-linear/astra_native.py --preflight

# JSON through stdin only; supervisor MUST impose timeoutMs as a hard process deadline.
/opt/hermes/.venv/bin/python -B scripts/feedback-linear/astra_native.py --complete
```

Preflight returns `{authRoute:'native-hermes-openai-codex',resolvedModel:'gpt-6-astra',ready:true}` after fixed-route resolution. `ready` is not workflow activation. `--complete` reads at most131072 stdin bytes before resolving a provider; its strict exact input is:

```json
{"instructions":"trusted CSS-only instruction","user":"one serialized bounded task/source message","maxInputTokens":40000,"maxBodyBytes":131072,"maxResponseBytes":262144,"timeoutMs":5000}
```

**There is no maxOutputTokens input and no generation-cap receipt requirement.** `complete(request)` is also importable from trusted code. All limits are positive integers; body <=131072 bytes, raw SSE response <=262144 bytes, timeout <=120000 ms. UTF-8 instruction/user bytes +1024 form a conservative input upper bound. Conservative serialized-body size is checked before native resolution. The request fixes model, one user input, no tools, `tool_choice:'none'`, `store:false`, streaming and retries0; generation cap is intentionally absent.

The native SDK's streaming-response interface supplies raw SSE bytes; there is no second credential/HTTP client. Byte/event/deadline limits, malformed/truncated SSE, unknown/tool/refusal events, incomplete status, contradictory text/terminals, negative/missing usage and mismatched returned model fail closed. Output usage is retained as actually reported, **not clamped to a fictitious generation limit**. Delta-only, done and terminal text are reconciled; empty production text is blocked. Missing server model is reported as null rather than invented; a returned wrong model is rejected. `serverMaxOutputTokens` is the actual optional server field or null, not an attestation or required budget control. Only completed output can become a candidate. Public diagnostics may report incomplete cap-exhaustion as evidence, never as a completed proposal.

Parent wiring must: run fixed no-inference preflight before source reads/claims; preserve the durable <=5-attempt reserve-before-effect ledger; supervise the fixed subprocess with a hard timeoutMs kill and bounded stdout; strictly parse actual receipt/usage; JSON-parse and run the existing CSS validator; retain genuine before/after checks, private review and human approval. Unknown outcomes never refund/retry. No new hosted database or paid account is needed. **No TypeScript/controller native wiring or new NativeAstraBroker is included in this bounded handoff.** The existing application default hold stays intact, not because of an invented cap/account requirement but because parent integration/review and the independent OAuth/intake dependencies remain outside this lane.

## Scoped evidence

`astra_native_probe.py --offline` runs the actual installed resolver + SDK with only token reader/HTTP peer synthetic and network forbidden, fixed public text and `SYNTHETIC_TRANSPORT_ONLY` receipt. It demonstrates forwarding, not account/server enforcement. `--public-smoke` is the explicit real one-request diagnostic described above; never run it as a test-suite command.

`tests/feedback-linear-astra-native.test.mjs` uses actual installed resolver/SDK/HTTP-SSE/CLI peers, no credentials or network, and covers exact request/no-tools, local versus server provenance, wrong-route/model preflight, strict terminal rejection, diagnostic incomplete distinction, retry-free400 handling, delta-only recovery, bounded stdin and no-effect preflight, and reviewed production omission with unclamped synthetic usage. Synthetic12/1 (and explicit128 /16384 cases) are not real usage. The existing TypeScript/count/quota tests are unchanged.

Vertical RED/GREEN logs are `/opt/data/tmp/atlas-astra-{red,green}-{1..11}.log`; final scoped/typecheck/lint evidence, helper/source hashes and exact SHA are in the private result report. Parent owns serial integrated full-suite/build/independent review; no such pass is claimed by this lane.

## Implemented provider/budget contract

`ReviewController` retains its public method signatures. A host adapter can supply a constructed controller. The discriminated `ReviewConfig` supports:

- Old explicit Anthropic/positive-USD fixtures and operator config, unchanged (omitted provider remains legacy programmatic compatibility). Optional `budget:{kind:'usd'}` labels that mode. This is not an approved alternative to the selected Astra account.
- `provider:'hermes-astra'` plus `budget:{kind:'attempts',maxAttemptsPerDay:5,timeZone:'Europe/Berlin'}`. Caps may be lowered to 1–4, never raised above five. `maxJobUsd`, `maxDayUsd`, provider price fields and `modelKey` are not part of this mode and are rejected by the operator schema.

Partial operator-model example only (common private roots/identities/public-key paths still required):

```json
{
  "provider": "hermes-astra",
  "budget": {"kind":"attempts","maxAttemptsPerDay":5,"timeZone":"Europe/Berlin"},
  "model": {
    "account":"hermes-default-openai-codex",
    "model":"gpt-6-astra",
    "maxTurns":1,
    "maxInputTokens":40000,
    "maxOutputTokens":1000,
    "maxBodyBytes":131072,
    "maxResponseBytes":262144,
    "timeoutMs":5000
  }
}
```

`hermes-default-openai-codex` is a **route/policy label**, not a server-returned account ID. The fixed native helper delegates authentication to the existing Hermes `openai-codex` resolver, with no credential inspection or account/provider substitution. Its receipt explicitly distinguishes `authRoute` and `accountIdentity` from `serverModel` and server usage. No new cryptographic account receipt is required or claimed. The application gate remains closed pending parent wiring/review; a native helper is not activation approval.

Positive `maxTokens`, `maxWallMs <= 600000`, `proposalTtlMs <= 86400000` remain mandatory. The model schema requires exactly one turn, the exact selected model/route, positive token/body/time limits, output <=8192 tokens, request <=131072 bytes, response <=262144 bytes and timeout <=120000 ms. No Anthropic key is requested in count mode. The existing disabled-before-config behavior remains.

## Durable attempts, not dollars

- The existing single-host atomic directory lock covers the entire preparation and count reservation. File/directory `fsync` and atomic manifest replacement persist each reservation **before** the model peer sees a request. Concurrent processes share this lock; there is no stale-lock takeover.
- `state.attempts` is separate from `state.spend`. A row records job, reservation UUID, day/timezone/timestamp, token upper bound, provider/route/model, policy digest, `reserved` or `completed`, optional verified usage, **`chargedUsd:null` and `pricing:'UNPRICED'`**. Proposal counts are never placed in USD fields; no made-up rates, zero-dollar claim or dollar-limit claim exists.
- Every reserved row counts, including failed, ambiguous, malformed and validation-rejected attempts. Completion records usage, never refunds the slot. Five failed calls still exhaust that day. A reservation/job cannot replay on a later day. Existing durable preparing/parked jobs never retry automatically.
- The boundary is explicit Europe/Berlin operator config, not server UTC. Changing the timezone of a populated root fails closed rather than refunding slots. All count rows in that root count toward its day's cap regardless of model/account policy changes. Keep the same stable private root; do not wipe/replace it to reset quotas. This is not protection against a malicious same-authority filesystem editor, changing hosts/roots, or restoring old backups.
- An `attempts-initialized` marker makes loss of the count field fail closed; old USD-only manifests migrate to an empty count array without relabeling old dollar charges as attempts. Loss of the initialized manifest and orphan process locks retain the existing fail-closed behavior.
- Provider, route/account label, exact model, quota kind/cap/timezone and positive limits enter the approval-policy digest. Changing any of them invalidates existing candidates/approvals; this digest upgrade intentionally invalidates older policy digests too. No capture or prior human decision can make a stale policy publish.

## Synthetic peer boundary and verification

The existing TypeScript model remains explicitly **fixture-only** pending parent integration of the native helper: loopback `127.0.0.1` with a port, no Vercel/production environment, fixed `/v1/responses`, no credential headers, arbitrary command/module loader or persistent service. Operator JSON forbids fixture/origin fields. Its custom strict response envelope is a **synthetic test protocol**, not a claim about native broker compatibility.

It sends only the bounded task/source/private instruction, one JSON CSS patch instruction, `tools:[]`, `tool_choice:'none'` and `store:false`. No agent, memory, world model, skills or MCP enters the request. Unknown keys, tools/function calls, alternate account/model/provider, incomplete output and unknown/over-limit usage fail closed with no retry. The controller applies the **actual old CSS validator**, detached checkout, baseline/candidate npm checks and existing private approval/publication gate. No old worker code or host/UI/backend/capture code changes.

Vertical RED→GREEN slices were executed for durable five-slot reservation, timezone non-refund, missing ledger, native unavailable gate, fixture JSON patch flow, strict response rejection, positive/model/account bounds, count-mode controller flow, quota-policy invalidation, early native preflight and runtime count parsing. Additional regression runs cover five ambiguous calls, restart/replay, independent concurrent processes, Berlin midnight/DST boundary, invalid selector, disabled defaults and old USD fixtures. Synthetic successful model usage is exactly **100 input / 100 output tokens** in the new peers; those numbers are invented fixture values, not real usage. Those are the prior integrated fixture results, not this lane’s real usage. The one public native smoke’s actual usage is19 input/5 output; dollars remain UNPRICED/null.

Run:

```sh
node --import tsx --test tests/feedback-linear-astra*.test.mjs
FEEDBACK_LINEAR_RECORDS_MODULE=file:///absolute/worktree/src/lib/feedback-linear/server/records.ts node --import tsx --test --test-name-pattern='actual backend signPrivateRecord' tests/feedback-linear-review.test.mjs
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
./node_modules/.bin/eslint scripts/feedback-linear/controller.ts scripts/feedback-linear/files.ts scripts/feedback-linear/runtime.ts scripts/feedback-linear/hermes-model.ts tests/feedback-linear-astra*.test.mjs
```

Activation still needs parent integration/independent review, real capture/private delivery acceptance and existing signer/host setup. Native route/model/usage evidence is verified above. Unsupported generation caps are explicitly omitted under the reviewed attempt-budget policy, not a new owner blocker. No Hermes changes, private inference, scheduler or production activation are authorized by this work.
