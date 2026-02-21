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
import { check, sleep, fail } from 'k6';

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

// Per-VU agent credentials (populated on first iteration)
const vuAgents = {};

/**
 * Default function: each VU registers its own agent on the first iteration,
 * then performs observe -> moveTo -> chatSend cycles.
 */
export default function () {
  // Per-VU registration on first iteration
  if (!vuAgents[__VU]) {
    const registerRes = http.post(
      `${AIC_BASE}/register`,
      JSON.stringify({
        name: `k6-agent-vu${__VU}-${randomString(6)}`,
        roomId: 'auto',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const registered = check(registerRes, {
      'register status 200': r => r.status === 200,
    });

    if (!registered) {
      fail(`VU ${__VU} registration failed with status ${registerRes.status}: ${registerRes.body}`);
    }

    const body = JSON.parse(registerRes.body);
    vuAgents[__VU] = {
      token: body.data.sessionToken,
      agentId: body.data.agentId,
      roomId: body.data.roomId,
    };
  }

  const data = vuAgents[__VU];
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
 * Teardown: unregister all per-VU agents after the test finishes.
 */
export function teardown() {
  for (const vu of Object.keys(vuAgents)) {
    const agent = vuAgents[vu];
    http.post(
      `${AIC_BASE}/unregister`,
      JSON.stringify({
        agentId: agent.agentId,
        roomId: agent.roomId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${agent.token}`,
        },
      }
    );
  }
}
