"""Schemathesis hooks for OpenClawWorld AIC API fuzzing.

Handles authentication and agent registration so that schemathesis can
exercise authenticated endpoints with valid credentials.
"""

import os
import sys

import requests
import schemathesis

BASE_URL = os.environ.get("SCHEMATHESIS_BASE_URL", "http://localhost:2567")
AIC_BASE = f"{BASE_URL}/aic/v0.1"

# Unauthenticated endpoint suffixes (no Bearer token needed)
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
    """Inject the Bearer token for authenticated endpoints."""
    if _session_token is None:
        setup()

    # Skip auth injection for unauthenticated endpoints
    path = case.path or ""
    if any(path.endswith(suffix) for suffix in _UNAUTHENTICATED_SUFFIXES):
        return

    if _session_token is None:
        return  # setup failed; let the test run without auth

    if case.headers is None:
        case.headers = {}
    case.headers["Authorization"] = f"Bearer {_session_token}"


@schemathesis.hook
def before_generate_body(context, case):
    """Inject valid agentId / roomId into request bodies that require them."""
    if _agent_id is None:
        setup()

    if not (case.body and isinstance(case.body, dict)):
        return

    # Replace fuzzed agentId with our registered one so auth checks pass
    if "agentId" in case.body:
        case.body["agentId"] = _agent_id

    # Replace placeholder roomId with the real room
    if "roomId" in case.body and _room_id is not None:
        case.body["roomId"] = _room_id
