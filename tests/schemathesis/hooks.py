"""Schemathesis hooks for OpenClawWorld AIC API fuzzing.

Handles authentication and agent registration so that schemathesis can
exercise authenticated endpoints with valid credentials.

Compatible with schemathesis v4.x.
"""

import os
import sys

import requests
import schemathesis

BASE_URL = os.environ.get("SCHEMATHESIS_BASE_URL", "http://localhost:2567")
AIC_BASE = f"{BASE_URL}/aic/v0.1"

# Unauthenticated endpoint suffixes (fallback when OpenAPI security metadata unavailable)
_UNAUTHENTICATED_SUFFIXES = ("/channels", "/register", "/reconnect")

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
def before_call(context, case):
    """Inject auth credentials and valid agent/room IDs before each request."""
    if _session_token is None:
        setup()

    # ── Auth header injection ──
    path = case.path or ""
    needs_auth = not any(path.endswith(s) for s in _UNAUTHENTICATED_SUFFIXES)

    if needs_auth and _session_token is not None:
        if case.headers is None:
            case.headers = {}
        case.headers["Authorization"] = f"Bearer {_session_token}"

    # ── Body: replace fuzzed agentId/roomId with registered values ──
    if case.body and isinstance(case.body, dict):
        if "agentId" in case.body and _agent_id is not None:
            case.body["agentId"] = _agent_id
        if "roomId" in case.body and _room_id is not None:
            case.body["roomId"] = _room_id
