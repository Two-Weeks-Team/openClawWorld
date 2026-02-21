/**
 * k6 HTTP Load Test for OpenClawWorld AIC API
 *
 * Requires k6 to be installed: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Usage:
 *   k6 run scripts/load-test-aic.js
 *   k6 run scripts/load-test-aic.js --vus 50 --duration 30s
 *   SERVER_URL=http://staging:2567 k6 run scripts/load-test-aic.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 randomString polyfill (avoids external import dependency)
function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.SERVER_URL || 'http://localhost:2567';
const AIC_BASE = `${BASE_URL}/aic/v0.1`;

/**
 * Setup: register an agent and return credentials for VU iterations.
 * Runs once before the test starts.
 */
export function setup() {
  const registerRes = http.post(
    `${AIC_BASE}/register`,
    JSON.stringify({
      name: `k6-agent-${randomString(6)}`,
      roomId: 'auto',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(registerRes, {
    'register status 200': r => r.status === 200,
  });

  const body = JSON.parse(registerRes.body);
  return {
    token: body.data.sessionToken,
    agentId: body.data.agentId,
    roomId: body.data.roomId,
  };
}

/**
 * Default function: each VU iteration performs observe -> moveTo -> chatSend.
 */
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Observe
  const observeRes = http.post(
    `${AIC_BASE}/observe`,
    JSON.stringify({
      agentId: data.agentId,
      roomId: data.roomId,
      radius: 100,
    }),
    { headers, tags: { endpoint: 'observe' } }
  );

  check(observeRes, {
    'observe status 200': r => r.status === 200,
  });

  sleep(0.5);

  // MoveTo
  const txId = `tx_${Date.now()}_${randomString(8)}`;
  const moveRes = http.post(
    `${AIC_BASE}/moveTo`,
    JSON.stringify({
      agentId: data.agentId,
      roomId: data.roomId,
      txId,
      dest: {
        tx: Math.floor(Math.random() * 20),
        ty: Math.floor(Math.random() * 15),
      },
    }),
    { headers, tags: { endpoint: 'moveTo' } }
  );

  check(moveRes, {
    'moveTo status 200': r => r.status === 200,
  });

  sleep(0.5);

  // ChatSend
  const chatTxId = `tx_${Date.now()}_${randomString(8)}`;
  const chatRes = http.post(
    `${AIC_BASE}/chatSend`,
    JSON.stringify({
      agentId: data.agentId,
      roomId: data.roomId,
      txId: chatTxId,
      channel: 'global',
      message: `k6 load test message ${Date.now()}`,
    }),
    { headers, tags: { endpoint: 'chatSend' } }
  );

  check(chatRes, {
    'chatSend status 200': r => r.status === 200,
  });

  sleep(1);
}

/**
 * Teardown: unregister the agent after all VUs finish.
 */
export function teardown(data) {
  http.post(
    `${AIC_BASE}/unregister`,
    JSON.stringify({
      agentId: data.agentId,
      roomId: data.roomId,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.token}`,
      },
    }
  );
}
