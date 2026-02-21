"""Schemathesis hooks for OpenClawWorld AIC API fuzzing.

Handles authentication and agent registration so that schemathesis can
exercise authenticated endpoints with valid credentials.

Compatible with schemathesis v4.x.
"""

from __future__ import annotations

import os
import sys

import requests
import schemathesis

BASE_URL = os.environ.get("SCHEMATHESIS_BASE_URL", "http://localhost:2567")
AIC_BASE = f"{BASE_URL}/aic/v0.1"

# Unauthenticated endpoint suffixes (fallback when OpenAPI security metadata unavailable)
_UNAUTHENTICATED_SUFFIXES = ("/channels", "/register", "/reconnect")

# Endpoints where we intentionally use an invalid token to prevent destructive side-effects.
# /unregister would permanently remove the test agent if called with a real token.
_FAKE_TOKEN_SUFFIXES = ("/unregister",)
_FAKE_TOKEN = "tok_fuzz_test_invalid_do_not_use"

# Global credential state populated by setup()
_session_token: str | None = None
_agent_id: str | None = None
_room_id: str | None = None


def setup() -> None:
    """Register a test agent and store credentials for later injection."""
    global _session_token, _agent_id, _room_id

    try:
        resp = requests.post(
            f"{AIC_BASE}/register",
            json={"name": "schemathesis-fuzzer", "roomId": "auto"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        _session_token = data["sessionToken"]
        _agent_id = data["agentId"]
        _room_id = data["roomId"]
        print(
            f"[hooks] Registered agent {_agent_id} in room {_room_id}",
            file=sys.stderr,
        )
    except Exception as exc:
        print(f"[hooks] WARNING: Agent registration failed: {exc}", file=sys.stderr)


@schemathesis.hook
def before_call(context, case, kwargs):
    """Inject auth credentials and valid agent/room IDs before each request."""
    if _session_token is None:
        setup()

    # ── Auth header injection ──
    path = case.path or ""
    needs_auth = not any(path.endswith(s) for s in _UNAUTHENTICATED_SUFFIXES)
    use_fake_token = any(path.endswith(s) for s in _FAKE_TOKEN_SUFFIXES)

    if needs_auth:
        if case.headers is None:
            case.headers = {}
        if use_fake_token:
            # Use an invalid token so destructive endpoints (e.g. /unregister) cannot
            # affect the real test agent.  Server will respond with 401, which is
            # documented in the spec.
            case.headers["Authorization"] = f"Bearer {_FAKE_TOKEN}"
        elif _session_token is not None:
            case.headers["Authorization"] = f"Bearer {_session_token}"

    # ── Body: replace fuzzed agentId/roomId with registered values ──
    # Skip for endpoints using the fake token — the body values are irrelevant
    # because the request will be rejected at auth before reaching business logic.
    if case.body and isinstance(case.body, dict) and not use_fake_token:
        if "agentId" in case.body and _agent_id is not None:
            case.body["agentId"] = _agent_id
        if "roomId" in case.body and _room_id is not None:
            case.body["roomId"] = _room_id
