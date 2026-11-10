# Astra subscription/count mode — integrated, application OFF

**Do not activate.** `astra_native.py` is an executable existing-Hermes native no-tools completion helper, not a fixture-only adapter. The TypeScript/controller now wire the fixed helper only under explicit `nativePolicy:'attempt-count-v1'`; old/default configurations retain the hold. No scheduler, service, account, credential, deployment, provider switch, profile or global Hermes changes were made.

## Reviewed safety/budget contract

- The selected budget is **existing Astra + at most5 durable attempts/day**, not dollars or a generation-token guarantee. The existing controller's durable reserve-before-effect ledger remains authoritative. The helper is not a standalone daily-quota service: the integrated runner calls it only after that reservation and never refund/retry an ambiguous attempt.
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

The integrated supervising runner performs preflight, reserves before the completion effect, enforces subprocess/received-byte bounds and normalizes the strict native result. The controller then applies actual CSS/check/review/publication gates. No new hosted database or paid account is introduced; activation remains separate.

## Scoped evidence

`astra_native_probe.py --offline` runs the actual installed resolver + SDK with only token reader/HTTP peer synthetic and network forbidden, fixed public text and `SYNTHETIC_TRANSPORT_ONLY` receipt. It demonstrates forwarding, not account/server enforcement. `--public-smoke` is the explicit real one-request diagnostic described above; never run it as a test-suite command.

`tests/feedback-linear-astra-native.test.mjs` uses actual installed resolver/SDK/HTTP-SSE/CLI peers, no credentials or network, and covers exact request/no-tools, local versus server provenance, wrong-route/model preflight, strict terminal rejection, diagnostic incomplete distinction, retry-free400 handling, delta-only recovery, bounded stdin and no-effect preflight, and reviewed production omission with unclamped synthetic usage. Synthetic12/1 (and explicit128 /16384 cases) are not real usage. The existing TypeScript/count/quota tests are unchanged.

Vertical RED/GREEN logs are `/opt/data/tmp/atlas-astra-{red,green}-{1..11}.log`; final scoped/typecheck/lint evidence, helper/source hashes and exact SHA are in the private result report. Parent owns serial integrated full-suite/build/independent review; no such pass is claimed by this lane.

## Integrated TypeScript/operator policy

`HermesAstraModel` now has a fixed native runner (`astra-process.ts`) selected only by trusted `nativePolicy:'attempt-count-v1'`. Default/legacy configs retain their explicit hold; no boolean silently upgrades them. The ordinary loopback fixture is a separate strict protocol and cannot be combined with native mode. Operator JSON cannot name an executable, module, endpoint or runner.

The controller performs fixed no-inference preflight before source reads/claims, reserves a durable <=5-attempt/day Europe/Berlin slot before completion, and supervises the actual isolated Python process with absolute timeout/kill, stdout bounds and a stripped environment without signing/publishing credentials. A different active Hermes profile cannot silently read the default profile's authentication route. Only the native SDK handles authentication; no raw credential/header is exposed.

Partial operator-model example (common private roots/identities/public-key paths are also required):

```json
{"provider":"hermes-astra","budget":{"kind":"attempts","maxAttemptsPerDay":5,"timeZone":"Europe/Berlin"},"model":{"account":"hermes-default-openai-codex","model":"gpt-6-astra","nativePolicy":"attempt-count-v1","maxTurns":1,"maxInputTokens":60000,"maxOutputTokens":1000,"maxBodyBytes":131072,"maxResponseBytes":262144,"timeoutMs":5000}}
```

Use total admission estimate `maxTokens:100000` in the common review config with this example. The offline `node --import tsx docs/qa/feedback-linear/astra-config-admission.mjs` probe reads these exact model settings and actual allowlisted Atlas CSS, checking both a short note and the maximum 3,000-code-unit note with near-maximum structural selector/classes/role and complete context. It must reach only an injected synthetic sentinel, never native authentication/inference; byte, time and no-tools bounds stay unchanged. Run it again when CSS or the example changes.

In this explicit native policy, **legacy `maxOutputTokens` and total `maxTokens` are admission estimates, not generation ceilings**. The native request omits a generation cap. New durable attempt rows carry `tokenPolicy:'attempt-count-v1'`; actual nonnegative safe-integer usage is recorded without clamping. Old capped fixture rows retain their old strict validation; no legacy rows are reinterpreted. Account/model/policy/quota/timezone and request/time/byte bounds enter the candidate policy digest. USD fields/model keys are forbidden in count config; prices remain UNPRICED/null.

## Durable attempts

Every reserved row counts, including failed/ambiguous calls. Completion records usage and never refunds a slot. A job cannot replay tomorrow; five failed attempts still exhaust today. Quota-only deferral occurs before claim and can run on a later day. Atomic directory locks, fsync/rename, initialization markers, restart/concurrency checks and timezone-change rejection protect this existing single-host private root. Never clear it or restore an old backup to reset quotas. This is not protection against a malicious same-authority host operator.

The actual old CSS validator, trusted baseline/candidate check subprocesses, genuine image requirements, private authenticated human review and separate draft-only publisher remain. Operator JSON forbids fixture origins, arbitrary executable/module hooks, Anthropic keys and dollar-budget fields for Astra. No service, scheduler, new account, real private inference or production activation was performed.

## Integrated verification

`tests/feedback-linear-astra-bridge.test.mjs` checks native policy selection, durable reserve-before-call ordering, actual usage above admission estimates and conservative ASCII-body rejection before reservation. `feedback-linear-astra-process.test.mjs` checks fixed executable/isolated Python, stripped environment, process timeout/kill, received-byte bounds, preflight, wrong-profile refusal, and real controller/filesystem/Git/check subprocesses with ONLY the native process peer synthetic. The native SDK tests above remain part of the standard suite; they never perform live inference.

A real no-inference TypeScript→fixed Python→native resolver preflight returned ready with the selected model. This is not a real JSON-CSS generation or live website acceptance. Exactly one public diagnostic was previously spent, with real receipt described above; no second inference ran.

Run `npm test`, `npm run typecheck`, `npm run build`, production audit and changed-source lint at the final head. See [activation/verification](feedback-linear-verification.md) for the remaining OAuth, witness custody/connectivity, current privacy review and genuine end-to-end acceptance requirements. No output cap, dollar limit or completed live workflow is claimed.
