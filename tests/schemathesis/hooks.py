"""Schemathesis hooks for OpenClawWorld AIC API fuzzing.

Handles authentication and agent registration so that schemathesis can
exercise authenticated endpoints with valid credentials.

Compatible with schemathesis v4.x.
"""

from __future__ import annotations

import os
import sys
import uuid

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
_skill_id: str | None = None
_action_id: str | None = None
_meeting_id: str | None = None


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def setup() -> None:
    """Register a test agent and discover skills/meetings for later injection."""
    global _session_token, _agent_id, _room_id, _skill_id, _action_id, _meeting_id

    # ── 1. Register agent ──────────────────────────────────────────────────
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
        return

    # ── 2. Discover available skills ──────────────────────────────────────
    try:
        resp = requests.post(
            f"{AIC_BASE}/skill/list",
            json={"agentId": _agent_id, "roomId": _room_id},
            headers=_auth_headers(_session_token),
            timeout=10,
        )
        if resp.status_code == 200:
            skills = resp.json().get("data", {}).get("skills", [])
            if skills:
                first_skill = skills[0]
                _skill_id = first_skill["id"]
                actions = first_skill.get("actions", [])
                if actions:
                    _action_id = actions[0]["id"]
                print(
                    f"[hooks] Found skill: {_skill_id}, action: {_action_id}",
                    file=sys.stderr,
                )
    except Exception as exc:
        print(f"[hooks] WARNING: Skill discovery failed: {exc}", file=sys.stderr)

    # ── 3. Install skill on the test agent ────────────────────────────────
    if _skill_id is not None:
        try:
            tx_id = f"tx_{uuid.uuid4().hex[:16]}"
            resp = requests.post(
                f"{AIC_BASE}/skill/install",
                json={
                    "agentId": _agent_id,
                    "roomId": _room_id,
                    "txId": tx_id,
                    "skillId": _skill_id,
                },
                headers=_auth_headers(_session_token),
                timeout=10,
            )
            if resp.status_code == 200:
                print(
                    f"[hooks] Installed skill {_skill_id} on agent {_agent_id}",
                    file=sys.stderr,
                )
            else:
                print(
                    f"[hooks] WARNING: Skill install returned {resp.status_code}",
                    file=sys.stderr,
                )
        except Exception as exc:
            print(f"[hooks] WARNING: Skill installation failed: {exc}", file=sys.stderr)

    # ── 4. Create a meeting via Colyseus matchmake ─────────────────────────
    _meeting_id = f"fuzz-meeting-{uuid.uuid4().hex[:8]}"
    try:
        resp = requests.post(
            f"{BASE_URL}/matchmake/create/meeting",
            json={
                "meetingId": _meeting_id,
                "orgId": "fuzz-test-org",
                "name": "Schemathesis Fuzz Meeting",
                "hostId": _agent_id,
                "capacity": 10,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            print(
                f"[hooks] Created meeting {_meeting_id}",
                file=sys.stderr,
            )
        else:
            print(
                f"[hooks] WARNING: Meeting creation returned {resp.status_code}: {resp.text[:200]}",
                file=sys.stderr,
            )
            _meeting_id = None
    except Exception as exc:
        print(f"[hooks] WARNING: Meeting creation failed: {exc}", file=sys.stderr)
        _meeting_id = None

    # ── 5. Join the test agent to the meeting ─────────────────────────────
    if _meeting_id is not None:
        try:
            resp = requests.post(
                f"{AIC_BASE}/meeting/join",
                json={"agentId": _agent_id, "roomId": _room_id, "meetingId": _meeting_id},
                headers=_auth_headers(_session_token),
                timeout=10,
            )
            if resp.status_code == 200:
                print(
                    f"[hooks] Agent {_agent_id} joined meeting {_meeting_id}",
                    file=sys.stderr,
                )
            else:
                print(
                    f"[hooks] WARNING: Initial meeting join returned {resp.status_code}",
                    file=sys.stderr,
                )
        except Exception as exc:
            print(f"[hooks] WARNING: Initial meeting join failed: {exc}", file=sys.stderr)


def _is_safe_header_value(value: str) -> bool:
    """Return True if the header value contains no HTTP-invalid control characters.

    The Node.js HTTP parser (llhttp) rejects any request header whose name or
    value contains a byte < 0x20, except for horizontal-tab (0x09 / '\\t').
    When schemathesis fuzzes header values it sometimes generates such bytes
    (e.g. ESC 0x1b).  Those requests never reach Express – Node drops the
    connection before it can write a response – which schemathesis then reports
    as a "JSON deserialization error" (empty / non-JSON response body).

    Filtering them out in before_call lets all requests reach the application
    layer so that response_schema_conformance and status_code_conformance checks
    actually exercise the server logic.
    """
    return all(ord(c) >= 0x20 or c == '\t' for c in str(value))


@schemathesis.hook
def before_call(context, case, kwargs):
    """Inject auth credentials and valid agent/room/skill/meeting IDs before each request."""
    if _session_token is None:
        setup()

    # ── Sanitize fuzz-generated headers ──
    # Remove any header whose name or value contains control characters that
    # llhttp (Node.js HTTP parser) would reject at the TCP level, producing an
    # empty response that schemathesis misreports as "JSON deserialization error".
    if case.headers:
        case.headers = {
            name: value
            for name, value in case.headers.items()
            if _is_safe_header_value(str(name)) and _is_safe_header_value(str(value))
        }

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

    # ── Body: replace fuzzed values with registered/discovered values ──
    # Skip for endpoints using the fake token — the body values are irrelevant
    # because the request will be rejected at auth before reaching business logic.
    if case.body and isinstance(case.body, dict) and not use_fake_token:
        if "agentId" in case.body and _agent_id is not None:
            case.body["agentId"] = _agent_id

        if "roomId" in case.body and _room_id is not None:
            # /register uses "auto" so the server auto-assigns a room (avoids
            # artificially populating a specific room with many fuzz-generated agents).
            if path.endswith("/register"):
                case.body["roomId"] = "auto"
            else:
                case.body["roomId"] = _room_id

        if "sessionToken" in case.body and _session_token is not None:
            # /reconnect authenticates via body sessionToken (no Authorization header).
            case.body["sessionToken"] = _session_token

        if "skillId" in case.body and _skill_id is not None:
            case.body["skillId"] = _skill_id

        if "actionId" in case.body and _action_id is not None:
            case.body["actionId"] = _action_id

        if "meetingId" in case.body and _meeting_id is not None:
            case.body["meetingId"] = _meeting_id

    # ── Pre-join meeting before /meeting/leave ────────────────────────────
    # /meeting/leave returns 404 if the agent is not a participant.
    # Ensure the test agent is always a participant before each leave test so
    # the endpoint can be exercised with a 200 response.
    if (
        path.endswith("/meeting/leave")
        and _meeting_id is not None
        and _session_token is not None
        and _agent_id is not None
        and _room_id is not None
    ):
        try:
            requests.post(
                f"{AIC_BASE}/meeting/join",
                json={"agentId": _agent_id, "roomId": _room_id, "meetingId": _meeting_id},
                headers=_auth_headers(_session_token),
                timeout=5,
            )
        except Exception:
            pass  # Best-effort; the leave test will proceed regardless
