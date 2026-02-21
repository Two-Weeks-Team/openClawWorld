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
HOOKS_FILE="tests/schemathesis/hooks.py"

echo "=== OpenClawWorld API Fuzzing ==="

# ── 1. Build workspace packages ──────────────────────────────────────────
echo "[1/4] Building workspace packages..."
pnpm -r build 2>&1 | tail -5

# ── 2. Start server in background ────────────────────────────────────────
echo "[2/4] Starting server on port ${PORT}..."
PORT=${PORT} NODE_ENV=development pnpm dev:server &
SERVER_PID=$!

cleanup() {
  echo ""
  echo "[cleanup] Stopping server (PID: ${SERVER_PID})..."
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
  echo "[cleanup] Done."
}
trap cleanup EXIT

# ── 3. Wait for server readiness ─────────────────────────────────────────
echo "[3/4] Waiting for server to be ready..."
for i in $(seq 1 "${MAX_WAIT}"); do
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

FUZZ_EXIT=0
schemathesis run "${BASE_URL}/openapi.json" \
  --checks all \
  --base-url "${BASE_URL}" \
  --hypothesis-max-examples "${MAX_EXAMPLES}" \
  --hypothesis-deadline 10000 \
  --request-timeout 10000 \
  --hooks "${HOOKS_FILE}" \
  --workers 1 \
  --show-trace \
  --junit-xml schemathesis-report.xml \
  || FUZZ_EXIT=$?

echo ""
echo "=== Fuzzing complete (exit code: ${FUZZ_EXIT}) ==="
exit "${FUZZ_EXIT}"
