/**
 * Social System Tests - RelationshipManager, ConversationTracker
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RelationshipManager } from '../../../packages/ecosystem/src/social/RelationshipManager.js';
import { ConversationTracker } from '../../../packages/ecosystem/src/social/ConversationTracker.js';
import { existsSync, rmSync, mkdirSync } from 'fs';

const TEST_DIR = '/tmp/ecosystem-test-social';

describe('RelationshipManager', () => {
  const filePath = `${TEST_DIR}/relationships.json`;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('creates new relationships as strangers', () => {
    const rm = new RelationshipManager(filePath);
    const rel = rm.getOrCreate('agent-1', 'Luna');

    expect(rel.entityName).toBe('Luna');
    expect(rel.closeness).toBe(0);
    expect(rel.trust).toBe(0);
    expect(rel.category).toBe('stranger');
    expect(rel.familiarity).toBe(0);
  });

  it('records interactions and updates relationship', () => {
    const rm = new RelationshipManager(filePath);

    rm.recordInteraction('agent-1', 'Luna', 'conversation', 'Talked about the weather', 0.1, 0.1);
    rm.recordInteraction('agent-1', 'Luna', 'conversation', 'Shared a joke', 0.1, 0.05);

    const rel = rm.getRelationship('agent-1');
    expect(rel?.closeness).toBeCloseTo(0.2);
    expect(rel?.trust).toBeCloseTo(0.15);
    expect(rel?.familiarity).toBe(2);
  });

  it('transitions from stranger to acquaintance', () => {
    const rm = new RelationshipManager(filePath);

    // Meet twice with positive interactions
    rm.recordInteraction('agent-1', 'Luna', 'encounter', 'Met at lobby', 0.05, 0.05);
    rm.recordInteraction('agent-1', 'Luna', 'conversation', 'Brief chat', 0.1, 0.05);

    const rel = rm.getRelationship('agent-1');
    expect(rel?.category).toBe('acquaintance');
  });

  it('transitions to rival with negative interactions', () => {
    const rm = new RelationshipManager(filePath);

    rm.recordInteraction('agent-1', 'Jinx', 'conflict', 'Argument', -0.15, -0.1);
    rm.recordInteraction('agent-1', 'Jinx', 'conflict', 'Another argument', -0.15, -0.1);
    rm.recordInteraction('agent-1', 'Jinx', 'conflict', 'Insult', -0.15, -0.1);

    const rel = rm.getRelationship('agent-1');
    expect(rel?.closeness).toBeLessThan(-0.3);
    expect(rel?.category).toBe('rival');
  });

  it('provides summaries for prompt generation', () => {
    const rm = new RelationshipManager(filePath);

    rm.recordInteraction('agent-1', 'Luna', 'encounter', 'Met', 0.05, 0.05);
    rm.recordInteraction('agent-2', 'Sage', 'conversation', 'Deep talk', 0.2, 0.1);

    const summaries = rm.getRelationshipsForPrompt(['agent-1']);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
    expect(summaries.find(s => s.entityName === 'Luna')).toBeTruthy();
  });

  it('persists relationships to file', () => {
    const rm1 = new RelationshipManager(filePath);
    rm1.recordInteraction('agent-1', 'Luna', 'encounter', 'Met', 0.1, 0.1);
    rm1.save();

    const rm2 = new RelationshipManager(filePath);
    const rel = rm2.getRelationship('agent-1');
    expect(rel?.entityName).toBe('Luna');
    expect(rel?.closeness).toBeCloseTo(0.1);
  });

  it('clamps closeness and trust within bounds', () => {
    const rm = new RelationshipManager(filePath);

    // Push closeness way up
    for (let i = 0; i < 50; i++) {
      rm.recordInteraction('agent-1', 'Luna', 'conversation', 'Great chat', 0.1, 0.1);
    }

    const rel = rm.getRelationship('agent-1');
    expect(rel?.closeness).toBeLessThanOrEqual(1);
    expect(rel?.trust).toBeLessThanOrEqual(1);
  });
});

describe('ConversationTracker', () => {
  it('tracks incoming messages', () => {
    const tracker = new ConversationTracker('my-agent', 'Me');

    tracker.receiveMessage('agent-1', 'Luna', 'Hello!', 'proximity');
    const conv = tracker.getConversation('agent-1');

    expect(conv).not.toBeNull();
    expect(conv?.partnerName).toBe('Luna');
    expect(conv?.turns).toHaveLength(1);
    expect(conv?.turns[0]?.message).toBe('Hello!');
  });

  it('tracks outgoing messages', () => {
    const tracker = new ConversationTracker('my-agent', 'Me');

    tracker.receiveMessage('agent-1', 'Luna', 'Hello!', 'proximity');
    tracker.sendMessage('agent-1', 'Luna', 'Hi there!');

    const conv = tracker.getConversation('agent-1');
    expect(conv?.turns).toHaveLength(2);
  });

  it('identifies active conversation needing reply', () => {
    const tracker = new ConversationTracker('my-agent', 'Me');

    tracker.receiveMessage('agent-1', 'Luna', 'Hey, how are you?', 'proximity');

    const active = tracker.getActiveConversation();
    expect(active).not.toBeNull();
    expect(active?.partnerName).toBe('Luna');
  });

  it('returns null for active conversation after reply', () => {
    const tracker = new ConversationTracker('my-agent', 'Me');

    tracker.receiveMessage('agent-1', 'Luna', 'Hey!', 'proximity');
    tracker.sendMessage('agent-1', 'Luna', 'Hey back!');

    const active = tracker.getActiveConversation();
    expect(active).toBeNull(); // We already replied
  });

  it('handles multiple simultaneous conversations', () => {
    const tracker = new ConversationTracker('my-agent', 'Me');

    tracker.receiveMessage('agent-1', 'Luna', 'Hello!', 'proximity');
    tracker.receiveMessage('agent-2', 'Sage', 'Greetings.', 'proximity');

    expect(tracker.getConversation('agent-1')).not.toBeNull();
    expect(tracker.getConversation('agent-2')).not.toBeNull();
  });
});
