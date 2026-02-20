#!/bin/bash
set -eo pipefail

for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "ERROR: '$cmd' is required but not installed."
        exit 1
    fi
done

SERVER_URL="${SERVER_URL:-http://localhost:2567}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "=== OpenClawWorld Server Test Suite ==="
echo "Server URL: $SERVER_URL"
echo ""

wait_for_server() {
    echo "[1/7] Waiting for server to be ready..."
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s "${SERVER_URL}/health" > /dev/null 2>&1; then
            echo "  Server is ready!"
            return 0
        fi
        echo "  Attempt $i/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    echo "  ERROR: Server failed to start"
    exit 1
}

test_health() {
    echo "[2/7] Testing /health endpoint..."
    RESPONSE=$(curl -s "${SERVER_URL}/health")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    if [ "$STATUS" = "ok" ]; then
        echo "  PASS: Health check returned status=ok"
        echo "  Response: $RESPONSE"
    else
        echo "  FAIL: Health check failed"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

test_metrics() {
    echo "[3/7] Testing /metrics endpoint..."
    RESPONSE=$(curl -s "${SERVER_URL}/metrics")
    
    if echo "$RESPONSE" | jq -e '.aicRequests' > /dev/null 2>&1; then
        echo "  PASS: Metrics endpoint returns valid JSON"
    else
        echo "  FAIL: Metrics endpoint invalid"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

test_register() {
    echo "[4/7] Testing POST /aic/v0.1/register..."
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/aic/v0.1/register" \
        -H "Content-Type: application/json" \
        -d '{"name": "TestAgent", "roomId": "auto"}')
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    AGENT_ID=$(echo "$RESPONSE" | jq -r '.data.agentId')
    SESSION_TOKEN=$(echo "$RESPONSE" | jq -r '.data.sessionToken')
    ROOM_ID=$(echo "$RESPONSE" | jq -r '.data.roomId // "channel-1"')

    if [ "$STATUS" = "ok" ] && [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ] && [ -n "$SESSION_TOKEN" ] && [ "$SESSION_TOKEN" != "null" ]; then
        echo "  PASS: Agent registered successfully"
        echo "  Agent ID: $AGENT_ID"
        echo "  Room ID: $ROOM_ID"
        export AGENT_ID
        export SESSION_TOKEN
        export ROOM_ID
    else
        echo "  FAIL: Agent registration failed"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

test_observe() {
    echo "[5/7] Testing POST /aic/v0.1/observe..."
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/aic/v0.1/observe" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${SESSION_TOKEN}" \
        -d "{\"agentId\": \"${AGENT_ID}\", \"roomId\": \"${ROOM_ID}\"}")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" = "ok" ]; then
        VISIBLE_COUNT=$(echo "$RESPONSE" | jq '.data.visibleEntities | length')
        echo "  PASS: Observe returned status=ok"
        echo "  Visible entities: $VISIBLE_COUNT"
    else
        echo "  FAIL: Observe failed"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

test_moveto() {
    echo "[6/7] Testing POST /aic/v0.1/moveTo..."
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/aic/v0.1/moveTo" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${SESSION_TOKEN}" \
        -d "{\"agentId\": \"${AGENT_ID}\", \"roomId\": \"${ROOM_ID}\", \"destination\": {\"x\": 5, \"y\": 5}}")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" = "ok" ]; then
        echo "  PASS: MoveTo returned status=ok"
    else
        echo "  FAIL: MoveTo failed"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

test_chat() {
    echo "[7/7] Testing POST /aic/v0.1/chatSend..."
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/aic/v0.1/chatSend" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${SESSION_TOKEN}" \
        -d "{\"agentId\": \"${AGENT_ID}\", \"roomId\": \"${ROOM_ID}\", \"message\": \"Hello from test!\"}")
    
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" = "ok" ]; then
        echo "  PASS: ChatSend returned status=ok"
    else
        echo "  FAIL: ChatSend failed"
        echo "  Response: $RESPONSE"
        exit 1
    fi
}

echo ""
wait_for_server
echo ""
test_health
echo ""
test_metrics
echo ""
test_register
echo ""
test_observe
echo ""
test_moveto
echo ""
test_chat
echo ""

echo "==================================="
echo "  ALL TESTS PASSED!"
echo "==================================="
