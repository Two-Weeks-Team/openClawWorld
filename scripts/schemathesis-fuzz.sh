#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# OpenClawWorld AIC API Fuzzing with Schemathesis
#
# Starts the dev server, waits for it to become healthy, then runs
# schemathesis against the live OpenAPI spec.
# ---------------------------------------------------------------------------

PORT="${SCHEMATHESIS_PORT:-2567}"
BASE_URL="http://localhost:${PORT}"
MAX_WAIT="${SCHEMATHESIS_MAX_WAIT:-30}"
MAX_EXAMPLES="${SCHEMATHESIS_MAX_EXAMPLES:-50}"
HOOKS_DIR="tests/schemathesis"

echo "=== OpenClawWorld API Fuzzing ==="

# ── 0. Evict any stale server on this port ───────────────────────────────
# On self-hosted runners, a prior job's tsx/node grandchildren survive when
# only the top-level pnpm process is killed (pnpm's SIGTERM does not
# propagate to its spawned tsx → node children).  Kill everything holding
# the port BEFORE we build so no old code is exercised by schemathesis.
echo "[0/4] Clearing port ${PORT}..."
STALE_PIDS=$(lsof -ti tcp:"${PORT}" 2>/dev/null || true)
if [ -n "${STALE_PIDS}" ]; then
  echo "  Evicting stale PIDs: ${STALE_PIDS}"
  echo "${STALE_PIDS}" | xargs kill -9 2>/dev/null || true
  sleep 1  # Allow the OS to release the port
fi

# ── 1. Build workspace packages ──────────────────────────────────────────
echo "[1/4] Building workspace packages..."
BUILD_LOG=$(mktemp)
if ! pnpm -r build > "${BUILD_LOG}" 2>&1; then
  echo "  ERROR: Build failed. Full output:"
  cat "${BUILD_LOG}"
  rm -f "${BUILD_LOG}"
  exit 1
fi
echo "  Build succeeded."
rm -f "${BUILD_LOG}"

# ── 2. Start server in background ────────────────────────────────────────
echo "[2/4] Starting server on port ${PORT}..."
PORT=${PORT} NODE_ENV=development pnpm dev:server &
SERVER_PID=$!

cleanup() {
  echo ""
  echo "[cleanup] Stopping server (PID: ${SERVER_PID})..."
  # Kill by port to catch tsx/node grandchildren that survive pnpm's SIGTERM
  lsof -ti tcp:"${PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
  echo "[cleanup] Done."
}
trap cleanup EXIT

# ── 3. Wait for server readiness ─────────────────────────────────────────
echo "[3/4] Waiting for server to be ready..."
for i in $(seq 1 "${MAX_WAIT}"); do
  # Fail fast if our process already died (e.g., port still in use after eviction)
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "  ERROR: Server process (PID ${SERVER_PID}) exited unexpectedly."
    exit 1
  fi
  if curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
    echo "  Server ready after ${i}s"
    break
  fi
  if [ "$i" -eq "${MAX_WAIT}" ]; then
    echo "  ERROR: Server failed to start within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 1
done

echo "  Verifying OpenAPI spec..."
if ! curl -sf "${BASE_URL}/openapi.json" > /dev/null; then
  echo "  ERROR: OpenAPI spec not accessible at ${BASE_URL}/openapi.json"
  exit 1
fi
echo "  OpenAPI spec verified."

# ── 4. Run schemathesis ──────────────────────────────────────────────────
echo "[4/4] Running schemathesis (max_examples=${MAX_EXAMPLES})..."
export SCHEMATHESIS_BASE_URL="${BASE_URL}"
export SCHEMATHESIS_HOOKS="hooks"
export PYTHONPATH="${HOOKS_DIR}:${PYTHONPATH:-}"

FUZZ_EXIT=0
# Checks used (subset of "all"):
#   not_a_server_error       — no 5xx responses
#   status_code_conformance  — returned codes match OpenAPI spec
#   response_schema_conformance — response bodies match OpenAPI schema
#
# Excluded checks and reasons:
#   ignored_auth      — hooks.py always injects auth; security checks can't probe
#                       unauthenticated behaviour reliably in this harness.
#   unsupported_method — Express auth middleware fires before method routing, so
#                        TRACE/etc. on auth-required paths return 401 not 405.
#   positive_data_acceptance — /unregister uses an intentional fake token (to
#                        prevent accidental removal of the test agent), so it
#                        always returns 401 rather than 2xx.
#   negative_data_rejection  — hooks.py replaces agentId/roomId with real values
#                        even when schemathesis generated invalid types, which
#                        turns intentionally-invalid requests into valid ones.
#                        The server then accepts them (200) and the check fails.
schemathesis run "${BASE_URL}/openapi.json" \
  --checks not_a_server_error,status_code_conformance,response_schema_conformance \
  --url "${BASE_URL}/aic/v0.1" \
  --max-examples "${MAX_EXAMPLES}" \
  --request-timeout 10000 \
  --workers 1 \
  --report junit \
  --report-junit-path schemathesis-report.xml \
  || FUZZ_EXIT=$?

echo ""
echo "=== Fuzzing complete (exit code: ${FUZZ_EXIT}) ==="
exit "${FUZZ_EXIT}"
