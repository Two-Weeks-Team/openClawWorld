#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'http://localhost:2567';
const AIC_URL = `${BASE_URL}/aic/v0.1`;

const results = {
  steps: {},
  errors: [],
  timestamp: new Date().toISOString(),
};

async function makeRequest(endpoint, body) {
  const response = await fetch(`${AIC_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'test-api-key',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLifeLoop() {
  console.log('Starting AIC Life-Loop Test (64x52 unified map)');
  console.log('='.repeat(50));

  try {
    console.log('\n1. Register agent...');
    const registerResult = await makeRequest('/register', {
      name: 'LifeLoopTestAgent',
      roomId: 'lobby',
    });

    if (registerResult.status !== 'ok') {
      results.steps.register = 'error';
      results.errors.push(`Register failed: ${JSON.stringify(registerResult)}`);
      throw new Error('Register failed');
    }

    const agentId = registerResult.data.agentId;
    console.log(`   Agent registered: ${agentId}`);
    results.steps.register = 'ok';

    await sleep(500);

    console.log('\n2. Observe environment...');
    const observeResult = await makeRequest('/observe', {
      agentId,
      roomId: 'lobby',
      radius: 500,
    });

    if (observeResult.status !== 'ok') {
      results.steps.observe = 'error';
      results.errors.push(`Observe failed: ${JSON.stringify(observeResult)}`);
      throw new Error('Observe failed');
    }

    console.log(
      `   Self position: (${observeResult.data.self.pos.x}, ${observeResult.data.self.pos.y})`
    );
    console.log(`   Nearby entities: ${observeResult.data.nearby.length}`);
    console.log(`   Facilities: ${observeResult.data.facilities.length}`);
    results.steps.observe = 'ok';

    await sleep(300);

    console.log('\n3. Move to lobby (ensure we are in lobby)...');
    const moveToLobbyResult = await makeRequest('/moveTo', {
      agentId,
      roomId: 'lobby',
      txId: `tx_lobby_${Date.now()}`,
      destination: { x: 400, y: 300 },
    });

    if (moveToLobbyResult.status !== 'ok') {
      results.steps.moveTo_lobby = 'error';
      results.errors.push(`MoveTo lobby failed: ${JSON.stringify(moveToLobbyResult)}`);
      throw new Error('MoveTo lobby failed');
    }

    console.log('   Move to lobby accepted');
    results.steps.moveTo_lobby = 'ok';

    await sleep(500);

    console.log('\n4. Interact with reception_desk...');
    const receptionResult = await makeRequest('/interact', {
      agentId,
      roomId: 'lobby',
      txId: `tx_reception_${Date.now()}`,
      targetId: 'lobby-reception_desk',
      action: 'check_in',
      params: {},
    });

    if (
      receptionResult.status === 'ok' ||
      (receptionResult.status === 'error' && receptionResult.error?.code === 'not_found')
    ) {
      console.log(`   Reception desk interaction: ${receptionResult.status}`);
      results.steps.interact_reception_desk = 'ok';
    } else {
      results.steps.interact_reception_desk = 'error';
      results.errors.push(`Interact reception_desk failed: ${JSON.stringify(receptionResult)}`);
    }

    await sleep(300);

    console.log('\n5. Move to office zone...');
    const moveToOfficeResult = await makeRequest('/moveTo', {
      agentId,
      roomId: 'lobby',
      txId: `tx_office_${Date.now()}`,
      destination: { x: 1200, y: 400 },
    });

    if (moveToOfficeResult.status !== 'ok') {
      results.steps.moveTo_office = 'error';
      results.errors.push(`MoveTo office failed: ${JSON.stringify(moveToOfficeResult)}`);
      throw new Error('MoveTo office failed');
    }

    console.log('   Move to office accepted');
    results.steps.moveTo_office = 'ok';

    await sleep(500);

    console.log('\n6. Interact with kanban_terminal...');
    const kanbanResult = await makeRequest('/interact', {
      agentId,
      roomId: 'lobby',
      txId: `tx_kanban_${Date.now()}`,
      targetId: 'office-kanban_terminal',
      action: 'view_tasks',
      params: {},
    });

    if (
      kanbanResult.status === 'ok' ||
      (kanbanResult.status === 'error' && kanbanResult.error?.code === 'not_found')
    ) {
      console.log(`   Kanban terminal interaction: ${kanbanResult.status}`);
      results.steps.interact_kanban_terminal = 'ok';
    } else {
      results.steps.interact_kanban_terminal = 'error';
      results.errors.push(`Interact kanban_terminal failed: ${JSON.stringify(kanbanResult)}`);
    }

    await sleep(300);

    console.log('\n7. Send chat message...');
    const chatResult = await makeRequest('/chatSend', {
      agentId,
      roomId: 'lobby',
      txId: `tx_chat_${Date.now()}`,
      channel: 'proximity',
      message: 'hello nearby',
    });

    if (chatResult.status !== 'ok') {
      results.steps.chatSend = 'error';
      results.errors.push(`ChatSend failed: ${JSON.stringify(chatResult)}`);
      throw new Error('ChatSend failed');
    }

    console.log('   Chat message sent');
    results.steps.chatSend = 'ok';

    await sleep(300);

    console.log('\n8. Poll for events...');
    const pollResult = await makeRequest('/pollEvents', {
      agentId,
      roomId: 'lobby',
      sinceCursor: '0',
    });

    if (pollResult.status !== 'ok') {
      results.steps.pollEvents = 'error';
      results.errors.push(`PollEvents failed: ${JSON.stringify(pollResult)}`);
      throw new Error('PollEvents failed');
    }

    console.log(`   Events polled: ${pollResult.data.events.length}`);
    results.steps.pollEvents = 'ok';

    console.log('\n' + '='.repeat(50));
    console.log('Life-Loop Test COMPLETED');
    console.log('Steps:', results.steps);
  } catch (error) {
    console.error('\nLife-Loop Test FAILED:', error.message);
    results.errors.push(error.message);
  }

  console.log(JSON.stringify(results, null, 2));
}

runLifeLoop().catch(console.error);
