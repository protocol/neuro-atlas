#!/usr/bin/env python3
"""Bounded private Linear adapter. OAuth stays inside Hermes's native MCP client.

No token access, raw HTTP, model sampling, server/config editing or arbitrary tool hook.
Production CLI uses only the existing 'linear' OAuth connection; stdin carries scope,
not transport config. _dispatch accepts a native client only for code-level fixture peers.
"""
import asyncio
import json
import logging
import os
import re
import sys

# The application runs in Hermes's shipped environment, not the app's npm dependencies.
sys.path.insert(0, "/opt/hermes")
FIELDS = ["id", "uuid", "title", "description", "url", "projectId", "teamId",
          "createdById", "archivedAt", "updatedAt"]
SCOPE = {"workspaceId", "workspace", "issueId", "projectId", "teamId", "ownerId"}
UUID = re.compile(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\Z")


def _require(ok, reason):
    if not ok:
        raise ValueError(reason)


async def _call(server, name, arguments):
    from tools.mcp_tool import mcp_field, matches_name_filter, _normalize_name_filter
    _require(name in {"get_workspace", "get_issue", "list_comments", "save_comment"}, "tool_not_allowed")
    config = server._config
    _require(isinstance(config, dict) and config.get("enabled") is not False
             and config.get("trust") != "untrusted", "native_client_disabled_or_untrusted")
    filters = config.get("tools") or {}
    _require(isinstance(filters, dict), "native_tool_filtered")
    include = filters.get("include")
    if isinstance(include, (str, list, tuple, set)):
        _require(matches_name_filter(name, _normalize_name_filter(include, "tools.include")), "native_tool_filtered")
    else:
        _require(not matches_name_filter(name, _normalize_name_filter(filters.get("exclude"), "tools.exclude")), "native_tool_filtered")
    _require(any(tool.name == name for tool in server._tools), "native_tool_unavailable")
    async with server._rpc_lock:
        result = await asyncio.wait_for(server.session.call_tool(name, arguments=arguments), 30)
    _require(not mcp_field(result, "is_error", "isError", False), "native_tool_rejected")
    blocks = result.content or []
    _require(len(blocks) == 1 and getattr(blocks[0], "type", "") == "text", "native_json_required")
    text = blocks[0].text
    _require(len(text) <= 2_000_000, "native_result_too_large")
    data = json.loads(text)
    _require(isinstance(data, dict), "native_object_required")
    return data


async def _comments(server, issue_id):
    found, seen_ids, seen_cursors, cursor = [], set(), set(), None
    total = None
    for _ in range(50):
        args = {"issueId": issue_id, "limit": 250, "orderBy": "createdAt"}
        if cursor is not None:
            args["cursor"] = cursor
        page = await _call(server, "list_comments", args)
        _require(isinstance(page.get("comments"), list) and len(page["comments"]) <= 250
                 and type(page.get("hasNextPage")) is bool, "native_pagination_unavailable")
        for comment in page["comments"]:
            _require(isinstance(comment, dict) and isinstance(comment.get("id"), str)
                     and comment["id"] not in seen_ids, "duplicate_comment")
            seen_ids.add(comment["id"])
            found.append(comment)
        _require(len(found) <= 10000, "comment_budget")
        if "totalCount" in page:
            _require(type(page["totalCount"]) is int and page["totalCount"] >= 0
                     and (total is None or total == page["totalCount"]), "native_total_mismatch")
            total = page["totalCount"]
        if page["hasNextPage"] is False:
            _require(total is None or total == len(found), "native_total_mismatch")
            return found
        cursor = page.get("cursor")
        _require(isinstance(cursor, str) and cursor and cursor not in seen_cursors, "native_cursor_repeated_or_missing")
        seen_cursors.add(cursor)
    raise ValueError("native_page_budget")


async def _scoped(server, s):
    workspace = await _call(server, "get_workspace", {})
    _require(workspace.get("id") == s["workspaceId"] and
             workspace.get("url") == "https://linear.app/" + s["workspace"], "workspace_mismatch")
    issue = await _call(server, "get_issue", {"id": s["issueId"], "fields": FIELDS})
    _require(issue.get("uuid") == s["issueId"] and issue.get("projectId") == s["projectId"]
             and issue.get("teamId") == s["teamId"] and
             str(issue.get("url", "")).startswith("https://linear.app/" + s["workspace"] + "/issue/"), "issue_scope_mismatch")
    return workspace, issue


def _ordinary(comment, issue_id):
    # Missing source fields are unknown, never silently treated as ordinary.
    _require(all(k in comment for k in ("issue", "parent", "externalThread", "syncedWith", "archivedAt", "quotedText")), "native_comment_lane_unavailable")
    _require(comment["issue"] == {"id": issue_id} and comment["parent"] is None
             and comment["externalThread"] is None and comment["syncedWith"] in (None, [])
             and comment["archivedAt"] is None and comment["quotedText"] is None, "native_comment_not_ordinary")


async def _dispatch(server, operation, payload):
    _require(operation in ("read", "comment"), "operation_not_allowed")
    _require(set(payload) == SCOPE | ({"body"} if operation == "comment" else set()), "scope_fields")
    for k in SCOPE - {"workspace"}:
        _require(isinstance(payload[k], str) and UUID.fullmatch(payload[k]), "scope_uuid")
    _require(isinstance(payload["workspace"], str) and re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", payload["workspace"]), "scope_workspace")
    workspace, issue = await _scoped(server, payload)
    first = await _comments(server, payload["issueId"])
    if operation == "read":
        second = await _comments(server, payload["issueId"])
        _, latest = await _scoped(server, payload)
        _require(first == second and latest == issue, "native_changed_during_read")
        return {"workspace": workspace, "issue": issue, "comments": second, "complete": True}
    body = payload["body"]
    _require(isinstance(body, str) and len(body) <= 16384 and body.startswith(("atlas-linear-proposal-v1\n", "atlas-linear-decision-v1\n")), "review_comment_only")
    # Never update an arbitrary supplied id, or use parentId (which can inherit a synced lane).
    _require(not any(c.get("body") == body for c in first), "comment_already_exists_reconcile_manually")
    result = await _call(server, "save_comment", {"issueId": payload["issueId"], "body": body})
    _require(isinstance(result.get("id"), str) and UUID.fullmatch(result["id"]), "comment_write_unknown")
    after = await _comments(server, payload["issueId"])
    exact = [c for c in after if c.get("id") == result["id"]]
    _require(len(exact) == 1 and exact[0].get("body") == body, "comment_readback_mismatch")
    _ordinary(exact[0], payload["issueId"])
    await _scoped(server, payload)
    return exact[0]


async def _main(operation, payload):
    from hermes_cli.env_loader import load_hermes_dotenv
    load_hermes_dotenv()
    from tools.mcp_tool import MCPServerTask, _load_mcp_config
    config = _load_mcp_config().get("linear")
    _require(isinstance(config, dict) and config.get("enabled") is not False and config.get("auth") == "oauth"
             and config.get("url") in ("https://mcp.linear.app/mcp", "https://mcp.linear.app/mcp/readonly")
             and not config.get("command") and config.get("trust") != "untrusted", "existing_native_oauth_setup_required")
    config = dict(config, sampling={"enabled": False}, elicitation={"enabled": False})
    server = MCPServerTask("linear")
    try:
        await asyncio.wait_for(server.start(config), 40)
        return await _dispatch(server, operation, payload)
    finally:
        await server.shutdown()


if __name__ == "__main__":
    # No-config OFF. Explicit smoke is read-only; writes require a separate explicit gate.
    operation = sys.argv[1] if len(sys.argv) == 2 else ""
    if os.environ.get("ATLAS_LINEAR_HOST_ENABLED") != "true" and operation != "read-smoke":
        print('{"state":"disabled"}')
        sys.exit(0)
    logging.disable(logging.CRITICAL)  # Never emit OAuth/provider objects or raw exceptions.
    try:
        _require(operation in ("read", "read-smoke", "comment"), "operation_not_allowed")
        _require(operation != "comment" or os.environ.get("ATLAS_LINEAR_HOST_WRITES_ENABLED") == "true", "writes_disabled")
        raw = sys.stdin.read(20001)
        _require(len(raw) <= 20000, "request_budget")
        value = asyncio.run(_main("read" if operation == "read-smoke" else operation, json.loads(raw)))
        print(json.dumps(value, separators=(",", ":")))
    except Exception as error:
        # Reasons are fixed local assertions. Transport exceptions expose only their class.
        reason = str(error) if type(error) is ValueError and re.fullmatch(r"[a-z_]+", str(error)) else type(error).__name__
        print(json.dumps({"state": "blocked", "reason": reason}), file=sys.stderr)
        sys.exit(1)
