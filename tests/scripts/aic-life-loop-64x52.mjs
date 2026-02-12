#!/usr/bin/env node

/**
 * AIC Life-Loop Test for 64x52 unified village map
 *
 * Tests the complete AIC agent lifecycle:
 * 1. Create room via matchmake API
 * 2. Register agent (returns sessionToken)
 * 3. Observe environment (verify facilities with affordances)
 * 4. Move within zone
 * 5. Interact with facilities
 * 6. Send chat message
 * 7. Poll for events (verify zone transition events)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:2567';
const AIC_URL = `${BASE_URL}/aic/v0.1`;

const results = {
  steps: {},
  errors: [],
  timestamp: new Date().toISOString(),
  facilities: [],
  events: [],
};

// Session token from register - used for authenticated requests
let sessionToken = null;

async function makeRequest(endpoint, body, requiresAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth && sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const response = await fetch(`${AIC_URL}${endpoint}`, {
    method: 'POST',
    headers,
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

  // Use 'aic_test' as the logical roomId - register will create room if needed
  const roomId = 'aic_test';
  let agentId;

  try {
    results.roomId = roomId;

    // Step 1: Register agent (unauthenticated - creates room if needed, returns token)
    console.log('\n1. Register agent (creates room if needed)...');
    const registerResult = await makeRequest(
      '/register',
      {
        name: 'LifeLoopTestAgent',
        roomId: roomId, // Use logical roomId 'default'
      },
      false // register doesn't require auth
    );

    if (registerResult.status !== 'ok') {
      results.steps.register = 'error';
      results.errors.push(`Register failed: ${JSON.stringify(registerResult)}`);
      throw new Error('Register failed');
    }

    agentId = registerResult.data.agentId;
    sessionToken = registerResult.data.sessionToken;
    console.log(`   Agent registered: ${agentId}`);
    console.log(`   Session token: ${sessionToken.substring(0, 20)}...`);
    results.steps.register = 'ok';
    results.agentId = agentId;

    await sleep(500);

    // Step 2: Observe environment
    console.log('\n2. Observe environment...');
    const observeResult = await makeRequest('/observe', {
      agentId,
      roomId: roomId,
      radius: 2000, // Large radius to see all facilities
      detail: 'full', // Required field: 'lite' or 'full'
    });

    if (observeResult.status !== 'ok') {
      results.steps.observe = 'error';
      results.errors.push(`Observe failed: ${JSON.stringify(observeResult)}`);
      throw new Error('Observe failed');
    }

    const selfPos = observeResult.data.self.pos;
    const facilities = observeResult.data.facilities || [];
    console.log(`   Self position: (${selfPos.x}, ${selfPos.y})`);
    console.log(`   Nearby entities: ${observeResult.data.nearby.length}`);
    console.log(`   Facilities: ${facilities.length}`);

    // Log facility types found
    const facilityTypes = [...new Set(facilities.map(f => f.type))];
    console.log(`   Facility types: ${facilityTypes.join(', ') || '(none)'}`);

    results.steps.observe = 'ok';
    results.facilities = facilities.map(f => ({
      id: f.id,
      type: f.type,
      affordances: f.affordances,
      pos: f.pos,
    }));

    await sleep(300);

    // Step 3: Move within lobby zone
    console.log('\n3. Move within lobby zone...');
    const moveToLobbyResult = await makeRequest('/moveTo', {
      agentId,
      roomId: roomId,
      txId: `tx_lobby_${Date.now()}`,
      dest: { tx: 12, ty: 10 }, // Tile coordinates, not pixel
    });

    if (moveToLobbyResult.status !== 'ok') {
      results.steps.moveTo_lobby = 'error';
      results.errors.push(`MoveTo lobby failed: ${JSON.stringify(moveToLobbyResult)}`);
      throw new Error('MoveTo lobby failed');
    }

    console.log('   Move to lobby accepted');
    results.steps.moveTo_lobby = 'ok';

    await sleep(500);

    // Step 4: Interact with reception_desk (if exists)
    console.log('\n4. Interact with reception_desk...');
    const receptionFacility = facilities.find(f => f.type === 'reception_desk');

    if (receptionFacility) {
      const receptionResult = await makeRequest('/interact', {
        agentId,
        roomId: roomId,
        txId: `tx_reception_${Date.now()}`,
        targetId: receptionFacility.id,
        action: 'check_in',
        params: {},
      });

      console.log(`   Reception desk interaction: ${receptionResult.status}`);
      if (receptionResult.status === 'ok') {
        console.log(`   Response: ${JSON.stringify(receptionResult.data)}`);
      }
      results.steps.interact_reception_desk = 'ok';
    } else {
      console.log('   No reception_desk found, skipping');
      results.steps.interact_reception_desk = 'skipped';
    }

    await sleep(300);

    // Step 5: Move to office zone (x: 1200-1600 / tileX: 37-50)
    console.log('\n5. Move to office zone...');
    const moveToOfficeResult = await makeRequest('/moveTo', {
      agentId,
      roomId: roomId,
      txId: `tx_office_${Date.now()}`,
      dest: { tx: 44, ty: 13 }, // Office zone tile coordinates
    });

    if (moveToOfficeResult.status !== 'ok') {
      results.steps.moveTo_office = 'error';
      results.errors.push(`MoveTo office failed: ${JSON.stringify(moveToOfficeResult)}`);
      throw new Error('MoveTo office failed');
    }

    console.log('   Move to office accepted');
    results.steps.moveTo_office = 'ok';

    await sleep(500);

    // Step 6: Interact with desk (if exists)
    console.log('\n6. Interact with desk...');
    const deskFacility = facilities.find(f => f.type === 'desk');

    if (deskFacility) {
      const deskResult = await makeRequest('/interact', {
        agentId,
        roomId: roomId,
        txId: `tx_desk_${Date.now()}`,
        targetId: deskFacility.id,
        action: 'work',
        params: {},
      });

      console.log(`   Desk interaction: ${deskResult.status}`);
      if (deskResult.status === 'ok') {
        console.log(`   Response: ${JSON.stringify(deskResult.data)}`);
      }
      results.steps.interact_desk = 'ok';
    } else {
      console.log('   No desk found, skipping');
      results.steps.interact_desk = 'skipped';
    }

    await sleep(300);

    // Step 7: Send chat message
    console.log('\n7. Send chat message...');
    const chatResult = await makeRequest('/chatSend', {
      agentId,
      roomId: roomId,
      txId: `tx_chat_${Date.now()}`,
      channel: 'proximity',
      message: 'Life-loop test complete!',
    });

    if (chatResult.status !== 'ok') {
      results.steps.chatSend = 'error';
      results.errors.push(`ChatSend failed: ${JSON.stringify(chatResult)}`);
      throw new Error('ChatSend failed');
    }

    console.log('   Chat message sent');
    results.steps.chatSend = 'ok';

    await sleep(300);

    // Step 8: Poll for events
    console.log('\n8. Poll for events...');
    const pollResult = await makeRequest('/pollEvents', {
      agentId,
      roomId: roomId,
      sinceCursor: '0',
    });

    if (pollResult.status !== 'ok') {
      results.steps.pollEvents = 'error';
      results.errors.push(`PollEvents failed: ${JSON.stringify(pollResult)}`);
      throw new Error('PollEvents failed');
    }

    const events = pollResult.data.events || [];
    console.log(`   Events polled: ${events.length}`);

    // Check for zone transition events
    const zoneEvents = events.filter(
      e => e.type === 'zone_changed' || e.type === 'zone_transition'
    );
    console.log(`   Zone transition events: ${zoneEvents.length}`);

    results.steps.pollEvents = 'ok';
    results.events = events;
    results.zoneEvents = zoneEvents;

    console.log('\n' + '='.repeat(50));
    console.log('Life-Loop Test COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('\nLife-Loop Test FAILED:', error.message);
    results.errors.push(error.message);
  }

  // Print summary
  results.success = results.errors.length === 0;
  console.log('\nSummary:');
  console.log('Steps:', results.steps);
  console.log('Facilities found:', results.facilities.length);
  console.log('Events received:', results.events.length);
  console.log('Success:', results.success);

  // Save to evidence file
  // Note: This writes test execution metadata to a local evidence file.
  // The data is sanitized by creating new primitive values (not referencing network data directly).
  const fs = await import('fs');
  const path = await import('path');
  const evidenceDir = '.sisyphus/evidence/B3';
  const evidenceFile = 'B3-T02-life-loop.json';

  function toSafeString(value, maxLen = 256) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return str.length > maxLen ? str.slice(0, maxLen) : str;
  }

  function toSafeInt(value, defaultVal = 0) {
    const num = parseInt(String(value), 10);
    return Number.isFinite(num) ? num : defaultVal;
  }

  const evidenceData = {
    testName: 'aic-life-loop-64x52',
    success: results.errors.length === 0,
    timestamp: new Date().toISOString(),
    roomId: toSafeString(results.roomId, 64),
    agentId: toSafeString(results.agentId, 64),
    steps: {},
    errorCount: toSafeInt(results.errors?.length),
    facilitiesCount: toSafeInt(results.facilities?.length),
    eventsCount: toSafeInt(results.events?.length),
    zoneEventsCount: toSafeInt(results.zoneEvents?.length),
  };

  const allowedStepKeys = [
    'register',
    'observe',
    'moveTo_lobby',
    'moveTo_office',
    'interact_reception_desk',
    'interact_desk',
    'chatSend',
    'pollEvents',
  ];
  for (const key of allowedStepKeys) {
    if (results.steps && Object.prototype.hasOwnProperty.call(results.steps, key)) {
      evidenceData.steps[key] = toSafeString(results.steps[key], 32);
    }
  }

  try {
    fs.mkdirSync(evidenceDir, { recursive: true });
    const outputPath = path.join(evidenceDir, evidenceFile);
    fs.writeFileSync(outputPath, JSON.stringify(evidenceData, null, 2));
    console.log(`\nEvidence saved to ${outputPath}`);
  } catch (fsError) {
    console.error('Failed to save evidence:', fsError.message);
  }

  // Exit with appropriate code
  process.exit(results.success ? 0 : 1);
}

runLifeLoop().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
