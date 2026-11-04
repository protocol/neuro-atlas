# Astra subscription/count mode — bounded, OFF, native broker blocked

**Do not activate. Real Astra inference is NOT implemented/accepted on this host.** The durable attempt-mode/controller integration is executable and tested with explicitly synthetic loopback peers. Production `hermes-astra` preparation instead throws `hermes_astra_bounded_broker_unavailable` **before native feedback reads, filesystem claims, checks, quota reservation or inference**. There is no fallback to Anthropic, Sol, an agent CLI, another account or an unbounded call.

This document supersedes the Anthropic-only/provider-budget wording in `feedback-linear-review.md`; its private capture, human decision, approval, publication, manual-merge and host custody requirements still apply unchanged. No cron, five-minute poll, service, secret, deployment or background activation is created here.

## Verified native blocker (2026-11-04)

Read current [Hermes subscription-proxy documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/subscription-proxy), its [documentation index](https://hermes-agent.nousresearch.com/docs/llms.txt), installed source, `hermes-agent`/`inference-providers` skills, fleet `model-selection.md` and software-house `model-routing.md` before choosing a route.

Actual local checks:

- `henry-set-provider --codex-models` lists **`gpt-6-astra`** as the live Astra slug. No global provider/model setting was changed.
- `hermes auth status openai-codex` says **`openai-codex: logged in`**. This establishes existing native login, not underlying account-identity attestation.
- `hermes proxy providers`, `hermes proxy start --help`, and installed `hermes_cli/proxy/adapters/__init__.py:16–19` expose **only `nous` and `xai`**, not the selected OpenAI Codex/Astra seat. The official current proxy docs list the same providers.
- The supported native direct helper `agent.auxiliary_client.resolve_provider_client('openai-codex', model=...)` exists. Its standard `CodexAuxiliaryClient` path deliberately omits output token caps (`agent/auxiliary_client.py:1638–1657`). The code comments say the Codex backend does not support `max_output_tokens`. The main transport independently strips the limit for Codex (`agent/transports/codex.py:879–881`).
- An **offline execution of the actual installed adapter**, with a synthetic transport that stops before network and without calling any credential resolver, confirmed that both `max_tokens=128` and `max_output_tokens=128` disappear. This is executable evidence about installed request construction, **not a live backend response or real authentication smoke**. A prompt asking for a short reply or truncating output locally would not enforce the requested generation/token budget.

No supported native route meeting all hard output/account bounds was verified. No real smoke was attempted: the permitted 128-output-token cap could not be enforced through the supported adapter. Raw SDK/agent workarounds, credential extraction, new provider setup and Hermes modifications are deliberately out of scope. The available raw client resolver is not proof that the selected backend enforces a cap.

Installed source SHA256:

| File under `/opt/hermes/` | SHA256 |
| --- | --- |
| `agent/auxiliary_client.py` | `d3d83147fbd57b08a946a8c9c0a4f189ea40294708c0d9e0b59cc09409d2f475` |
| `agent/transports/codex.py` | `c90e07e6bbb01e27fe2ebd24ca96f6efffd0458738efb83fe064851b993a05c3` |
| `hermes_cli/proxy/adapters/__init__.py` | `df44669cad2a9b715c872f010b277a84f5125278ead6a4a291e3c0650d86e925` |

### Reproduce offline (no credentials, network or inference)

Save this Python to an ordinary temporary diagnostic file; execute with `/opt/hermes/.venv/bin/python /absolute/path/to/probe.py`. No config, auth store or profile edits are required. The imported installed adapter receives a **synthetic client**, not a resolved authenticated client.

```python
import json
import sys
from types import SimpleNamespace
sys.path.insert(0, '/opt/hermes')
from agent.auxiliary_client import _CodexCompletionsAdapter
from hermes_cli.proxy.adapters import ADAPTERS
seen = []
class StopBeforeNetwork(Exception):
    pass

def intercept(**kwargs):
    seen.append(kwargs)
    raise StopBeforeNetwork()

client = SimpleNamespace(
    base_url='https://chatgpt.com/backend-api/codex',
    responses=SimpleNamespace(create=intercept),
)
try:
    _CodexCompletionsAdapter(client, 'gpt-6-astra').create(
        model='gpt-6-astra',
        messages=[{'role':'system','content':'Reply only JSON.'},
                  {'role':'user','content':'Return {"ok":true}.'}],
        tools=[], tool_choice='none', max_tokens=128,
        max_output_tokens=128, timeout=1,
    )
except StopBeforeNetwork:
    pass
assert len(seen) == 1
body = {**seen[0], **seen[0].get('extra_body', {})}
result = {
    'proxyProviders': sorted(ADAPTERS),
    'model': body.get('model'),
    'forwardedMaxOutputTokens': body.get('max_output_tokens'),
    'forwardedMaxTokens': body.get('max_tokens'),
}
print(json.dumps(result, sort_keys=True))
assert result == {'proxyProviders':['nous','xai'], 'model':'gpt-6-astra',
                  'forwardedMaxOutputTokens':None, 'forwardedMaxTokens':None}
```

Observed output:

```json
{"forwardedMaxOutputTokens": null, "forwardedMaxTokens": null, "model": "gpt-6-astra", "proxyProviders": ["nous", "xai"]}
```

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

`hermes-default-openai-codex` is a **route/policy label**, not a verified upstream account ID. A future native bridge must supply trusted exact-account attestation before activation. Configuring the label cannot authorize another account. Current production mode remains blocked regardless.

Positive `maxTokens`, `maxWallMs <= 600000`, `proposalTtlMs <= 86400000` remain mandatory. The model schema requires exactly one turn, the exact selected model/route, positive token/body/time limits, output <=8192 tokens, request <=131072 bytes, response <=262144 bytes and timeout <=120000 ms. No Anthropic key is requested in count mode. The existing disabled-before-config behavior remains.

## Durable attempts, not dollars

- The existing single-host atomic directory lock covers the entire preparation and count reservation. File/directory `fsync` and atomic manifest replacement persist each reservation **before** the model peer sees a request. Concurrent processes share this lock; there is no stale-lock takeover.
- `state.attempts` is separate from `state.spend`. A row records job, reservation UUID, day/timezone/timestamp, token upper bound, provider/route/model, policy digest, `reserved` or `completed`, optional verified usage, **`chargedUsd:null` and `pricing:'UNPRICED'`**. Proposal counts are never placed in USD fields; no made-up rates, zero-dollar claim or dollar-limit claim exists.
- Every reserved row counts, including failed, ambiguous, malformed and validation-rejected attempts. Completion records usage, never refunds the slot. Five failed calls still exhaust that day. A reservation/job cannot replay on a later day. Existing durable preparing/parked jobs never retry automatically.
- The boundary is explicit Europe/Berlin operator config, not server UTC. Changing the timezone of a populated root fails closed rather than refunding slots. All count rows in that root count toward its day's cap regardless of model/account policy changes. Keep the same stable private root; do not wipe/replace it to reset quotas. This is not protection against a malicious same-authority filesystem editor, changing hosts/roots, or restoring old backups.
- An `attempts-initialized` marker makes loss of the count field fail closed; old USD-only manifests migrate to an empty count array without relabeling old dollar charges as attempts. Loss of the initialized manifest and orphan process locks retain the existing fail-closed behavior.
- Provider, route/account label, exact model, quota kind/cap/timezone and positive limits enter the approval-policy digest. Changing any of them invalidates existing candidates/approvals; this digest upgrade intentionally invalidates older policy digests too. No capture or prior human decision can make a stale policy publish.

## Synthetic peer boundary and verification

The only request-capable Astra implementation here is explicitly **fixture-only**: loopback `127.0.0.1` with a port, no Vercel/production environment, fixed `/v1/responses`, no credential headers, arbitrary command/module loader or persistent service. Operator JSON forbids fixture/origin fields. Its custom strict response envelope is a **synthetic test protocol**, not a claim about native broker compatibility.

It sends only the bounded task/source/private instruction, one JSON CSS patch instruction, `tools:[]`, `tool_choice:'none'` and `store:false`. No agent, memory, world model, skills or MCP enters the request. Unknown keys, tools/function calls, alternate account/model/provider, incomplete output and unknown/over-limit usage fail closed with no retry. The controller applies the **actual old CSS validator**, detached checkout, baseline/candidate npm checks and existing private approval/publication gate. No old worker code or host/UI/backend/capture code changes.

Vertical RED→GREEN slices were executed for durable five-slot reservation, timezone non-refund, missing ledger, native unavailable gate, fixture JSON patch flow, strict response rejection, positive/model/account bounds, count-mode controller flow, quota-policy invalidation, early native preflight and runtime count parsing. Additional regression runs cover five ambiguous calls, restart/replay, independent concurrent processes, Berlin midnight/DST boundary, invalid selector, disabled defaults and old USD fixtures. Synthetic successful model usage is exactly **100 input / 100 output tokens** in the new peers; those numbers are invented fixture values, not real usage. Real provider usage/cost are unavailable because no real call ran.

Run:

```sh
node --import tsx --test tests/feedback-linear-astra*.test.mjs
FEEDBACK_LINEAR_RECORDS_MODULE=file:///absolute/worktree/src/lib/feedback-linear/server/records.ts node --import tsx --test --test-name-pattern='actual backend signPrivateRecord' tests/feedback-linear-review.test.mjs
npm test
npm run typecheck
NEXT_TELEMETRY_DISABLED=1 npm run build
./node_modules/.bin/eslint scripts/feedback-linear/controller.ts scripts/feedback-linear/files.ts scripts/feedback-linear/runtime.ts scripts/feedback-linear/hermes-model.ts tests/feedback-linear-astra*.test.mjs
```

Activation still needs a supported enforceably bounded native broker, trusted exact-account/model and usage readback, independent review/integration, real capture/private delivery acceptance and existing signer/host setup. **Do not solve this blocker by changing Hermes or broadening the framework in this lane.**
