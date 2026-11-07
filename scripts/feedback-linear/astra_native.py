#!/usr/bin/env python3
"""Fixed no-tools raw Responses route via Hermes's native Codex resolver.

No credential/header inspection, custom endpoint, agent, provider fallback or config
mutation. The native resolver owns authentication to the existing selected seat.
A supervising caller must enforce an absolute subprocess deadline as well.
"""
import json
import sys
import time
sys.path.insert(0, "/opt/hermes")


def resolve_native():
    from agent.auxiliary_client import resolve_provider_client
    client, model = resolve_provider_client(
        "openai-codex", model="gpt-6-astra", raw_codex=True)
    if (client is None or model != "gpt-6-astra"
            or str(client.base_url).rstrip("/") != "https://chatgpt.com/backend-api/codex"):
        raise ValueError("native_route_unavailable")
    return client, model


def _events(response, limit, deadline):
    """Read bounded raw SSE bytes through the native SDK, not a second HTTP client."""
    pending, size = b"", 0
    for chunk in response.iter_bytes(chunk_size=4096):
        size += len(chunk)
        if size > limit or time.monotonic() > deadline:
            raise ValueError("native_response_limit")
        pending = (pending + chunk).replace(b"\r\n", b"\n")
        while b"\n\n" in pending:
            block, pending = pending.split(b"\n\n", 1)
            data = b"\n".join(line[5:].lstrip(b" ") for line in block.split(b"\n")
                              if line.startswith(b"data:"))
            if data and data != b"[DONE]":
                event = json.loads(data)
                if not isinstance(event, dict):
                    raise ValueError("provider_unknown_outcome")
                yield event
    if pending.strip():
        raise ValueError("provider_unknown_outcome")


def complete(request, *, allow_incomplete=False, diagnostic_cap=None):
    # Reviewed native policy: no supported generation-token guarantee. The
    # already-authorized public smoke alone requested128; never widen/retry it.
    fields = {"instructions", "user", "maxInputTokens",
              "maxBodyBytes", "maxResponseBytes", "timeoutMs"}
    if (not isinstance(request, dict) or set(request) != fields
            or not all(isinstance(request.get(k), str) for k in ("instructions", "user"))
            or not all(type(request.get(k)) is int and request[k] > 0
                       for k in fields - {"instructions", "user"})
            or diagnostic_cap not in (None, 128) or request["maxBodyBytes"] > 131072
            or request["maxResponseBytes"] > 262144 or request["timeoutMs"] > 120000):
        raise ValueError("native_input_limit")
    upper_input = len(request["instructions"].encode()) + len(request["user"].encode()) + 1024
    cap = diagnostic_cap
    body = {"model": "gpt-6-astra", "store": False,
            "stream": True, "tools": [], "tool_choice": "none",
            "instructions": request["instructions"],
            "input": [{"role": "user", "content": request["user"]}]}
    if cap is not None:
        body["max_output_tokens"] = cap
    # ASCII escaping + spacing is deliberately conservative relative to SDK JSON.
    if (upper_input > request["maxInputTokens"]
            or len(json.dumps(body).encode()) + 256 > request["maxBodyBytes"]):
        raise ValueError("native_input_limit")
    client, _ = resolve_native()
    terminal, deltas, done, event_count = None, [], [], 0
    deadline = time.monotonic() + request["timeoutMs"] / 1000
    with client.with_options(max_retries=0, timeout=request["timeoutMs"] / 1000) as bounded:
        with bounded.responses.with_streaming_response.create(**body) as response:
            for event in _events(response, request["maxResponseBytes"], deadline):
                event_count += 1
                kind = event.get("type", "")
                if event_count > 4096 or terminal is not None:
                    raise ValueError("provider_unknown_outcome")
                if kind == "response.output_text.delta":
                    if not isinstance(event.get("delta"), str):
                        raise ValueError("provider_unknown_outcome")
                    deltas.append(event["delta"])
                elif kind == "response.output_text.done":
                    if not isinstance(event.get("text"), str):
                        raise ValueError("provider_unknown_outcome")
                    done.append(event["text"])
                elif kind in ("response.output_item.added", "response.output_item.done"):
                    if event.get("item", {}).get("type") not in ("message", "reasoning"):
                        raise ValueError("provider_unknown_outcome")
                elif kind in ("response.content_part.added", "response.content_part.done"):
                    if event.get("part", {}).get("type") != "output_text":
                        raise ValueError("provider_unknown_outcome")
                elif kind in ("response.completed", "response.incomplete"):
                    terminal = event.get("response")
                elif kind not in ("response.created", "response.in_progress", "response.metadata",
                                  "response.reasoning_summary_part.added", "response.reasoning_summary_part.done",
                                  "response.reasoning_summary_text.delta", "response.reasoning_summary_text.done",
                                  "response.reasoning_text.delta", "response.reasoning_text.done"):
                    raise ValueError("provider_unknown_outcome")
    usage = terminal.get("usage") if isinstance(terminal, dict) else None
    if (not isinstance(terminal, dict) or terminal.get("model") not in (None, "gpt-6-astra")
            or terminal.get("status") not in ("completed", "incomplete")
            or (terminal.get("status") == "incomplete" and (
                not allow_incomplete or terminal.get("incomplete_details", {}).get("reason") != "max_output_tokens"))
            or (cap is not None and terminal.get("max_output_tokens") != cap)
            or terminal.get("tools") != []
            or terminal.get("tool_choice") != "none" or terminal.get("store") is not False
            or terminal.get("error") is not None or not isinstance(usage, dict)
            or type(usage.get("input_tokens")) is not int or not 0 <= usage["input_tokens"] <= upper_input
            or type(usage.get("output_tokens")) is not int or usage["output_tokens"] < 0
            or (cap is not None and usage["output_tokens"] > cap)
            or not isinstance(terminal.get("output"), list)):
        raise ValueError("provider_unknown_outcome")
    text = []
    for item in terminal["output"]:
        if not isinstance(item, dict) or item.get("type") not in ("message", "reasoning"):
            raise ValueError("provider_unknown_outcome")
        if item["type"] == "message":
            if item.get("role") != "assistant" or not isinstance(item.get("content"), list):
                raise ValueError("provider_unknown_outcome")
            for part in item["content"]:
                if not isinstance(part, dict) or part.get("type") != "output_text" or not isinstance(part.get("text"), str):
                    raise ValueError("provider_unknown_outcome")
                text.append(part["text"])
    candidates = ["".join(parts) for parts in (deltas, done, text) if parts]
    if len(set(candidates)) > 1 or (not candidates and not allow_incomplete):
        raise ValueError("provider_unknown_outcome")
    return {"status": terminal["status"], "serverModel": terminal.get("model"),
            "serverMaxOutputTokens": terminal.get("max_output_tokens"),
            "usage": {"inputTokens": usage["input_tokens"], "outputTokens": usage["output_tokens"]},
            "text": candidates[0] if candidates else "",
            "authRoute": "native-hermes-openai-codex",
            "accountIdentity": "NATIVE_BROKER_SELECTED_NOT_SERVER_ATTESTED",
            "chargedUsd": None, "pricing": "UNPRICED"}


def public_smoke():
    """One fixed public-text request; requires explicit authorization, never retry."""
    return complete({"instructions": "Reply with exactly OK.", "user": "Public transport diagnostic.",
                     "maxInputTokens": 10000, "maxBodyBytes": 131072,
                     "maxResponseBytes": 262144, "timeoutMs": 10000}, allow_incomplete=True, diagnostic_cap=128)


def smoke_diagnostic():
    from openai import APIStatusError
    try:
        return public_smoke()
    except APIStatusError as error:
        # Never print an SDK exception, headers, credentials or arbitrary bodies.
        detail = error.body.get("detail") if isinstance(error.body, dict) else None
        return {"status": "rejected", "httpStatus": error.status_code,
                "error": (detail if detail == "Unsupported parameter: max_output_tokens"
                          else type(error).__name__), "serverModel": None, "usage": None}
    except Exception as error:
        return {"status": "unknown", "error": type(error).__name__, "serverModel": None, "usage": None}


def main():
    if sys.argv[1:] == ["--preflight"]:
        client, model = resolve_native()
        client.close()
        return {"authRoute": "native-hermes-openai-codex", "resolvedModel": model, "ready": True}
    if sys.argv[1:] == ["--complete"]:
        raw = sys.stdin.buffer.read(131073)
        if len(raw) > 131072:
            raise ValueError("native_input_limit")
        return complete(json.loads(raw))
    raise ValueError("native_operation_not_allowed")


if __name__ == "__main__":
    try:
        result = main()
    except Exception as error:
        # Never put a private provider body or an SDK traceback on stdout/stderr.
        print(json.dumps({"status": "error", "error": type(error).__name__}))
        raise SystemExit(1)
    print(json.dumps(result, sort_keys=True))
