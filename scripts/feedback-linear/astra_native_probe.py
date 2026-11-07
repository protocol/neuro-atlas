#!/usr/bin/env python3
"""Native diagnostics: offline serialization or explicitly authorized PUBLIC smoke.

--offline uses a synthetic token reader/HTTP peer, no credentials or network.
--public-smoke sends one fixed public-text capped request through native auth.
No caller text, credential inspection, tools, agents or settings mutations.
"""
import json
import socket
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, "/opt/hermes")
sys.path.insert(0, str(Path(__file__).resolve().parent))


def offline_probe():
    import httpx
    from agent import auxiliary_client as native

    seen = []
    synthetic = {
        "id": "resp_synthetic", "object": "response", "created_at": 0,
        "status": "completed", "model": "gpt-6-astra", "output": [],
        "usage": {"input_tokens": 12, "output_tokens": 1, "total_tokens": 13},
    }

    def intercept(request):
        # Intentionally NEVER inspect request.headers or authentication.
        seen.append((str(request.url), json.loads(request.content)))
        event = {"type": "response.completed", "sequence_number": 0,
                 "response": synthetic}
        return httpx.Response(200, headers={"content-type": "text/event-stream"},
                              content="data: " + json.dumps(event) + "\n\n")

    def deny_network(*_args, **_kwargs):
        raise AssertionError("offline_probe_network_forbidden")

    with (patch.object(socket.socket, "connect", side_effect=deny_network) as network,
          patch.object(socket, "create_connection", side_effect=deny_network),
          patch.object(socket, "getaddrinfo", side_effect=deny_network),
          httpx.Client(transport=httpx.MockTransport(intercept), trust_env=False) as http,
          patch.object(native, "_read_codex_access_token", return_value="synthetic-unused") as reader,
          patch.object(native, "_openai_http_client_kwargs", return_value={"http_client": http})):
        resolved = native.resolve_provider_client(
            "openai-codex", model="gpt-6-astra", raw_codex=True)
        # The supported resolver returns a client and model, not an independent
        # selected-account attestation or an upstream cap capability receipt.
        assert isinstance(resolved, tuple) and len(resolved) == 2
        client, model = resolved
        with client.with_options(max_retries=0, timeout=2) as bounded:
            with bounded.responses.create(
                model=model, max_output_tokens=128, store=False, stream=True,
                tools=[], tool_choice="none", instructions="Reply with exactly OK.",
                input=[{"role": "user", "content": "Public transport diagnostic."}],
            ) as stream:
                events = list(stream)
        assert len(seen) == 1 and len(events) == 1
        usage = events[0].response.usage
        return {
            "evidence": "SYNTHETIC_TRANSPORT_ONLY", "nativeResolverCalls": reader.call_count,
            "requests": len(seen), "networkCalls": network.call_count,
            "requestPath": seen[0][0], "body": seen[0][1], "resolvedModel": model,
            "syntheticUsage": {"inputTokens": usage.input_tokens,
                               "outputTokens": usage.output_tokens},
            "resolverReturnShape": ["client", "model"],
            "serverResponseObserved": False,
        }


from astra_native import public_smoke, smoke_diagnostic


if __name__ == "__main__":
    if sys.argv[1:] == ["--offline"]:
        result = offline_probe()
    elif sys.argv[1:] == ["--public-smoke"]:
        result = smoke_diagnostic()
    else:
        raise SystemExit("fixed_diagnostic_only: use --offline or --public-smoke; no caller input")
    print(json.dumps(result, sort_keys=True))
