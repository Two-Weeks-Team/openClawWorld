/**
 * Memory System Tests - EpisodicMemory, SemanticMemory, MemoryManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EpisodicMemory } from '../../../packages/ecosystem/src/memory/EpisodicMemory.js';
import { SemanticMemory } from '../../../packages/ecosystem/src/memory/SemanticMemory.js';
import { WorkingMemory } from '../../../packages/ecosystem/src/memory/WorkingMemory.js';
import { MemoryManager } from '../../../packages/ecosystem/src/memory/MemoryManager.js';
import type { EpisodicRecord } from '../../../packages/ecosystem/src/types/memory.types.js';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const TEST_DIR = '/tmp/ecosystem-test-memory';

function makeEpisode(overrides?: Partial<EpisodicRecord>): EpisodicRecord {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    type: 'observation',
    content: 'Test observation',
    participants: [],
    location: { zone: 'lobby', x: 100, y: 200 },
    importance: 5,
    emotionSnapshot: { valence: 0.2, arousal: 0.3, dominance: 0.5 },
    tags: ['test'],
    ...overrides,
  };
}

describe('WorkingMemory', () => {
  let wm: WorkingMemory;

  beforeEach(() => {
    wm = new WorkingMemory();
  });

  it('starts with empty state', () => {
    const state = wm.getState();
    expect(state.currentZone).toBeNull();
    expect(state.nearbyEntities).toHaveLength(0);
    expect(state.pendingMessages).toHaveLength(0);
  });

  it('updates position and tracks changes', () => {
    wm.updatePosition(100, 200, 'lobby');
    expect(wm.getState().currentPosition).toEqual({ x: 100, y: 200 });
    expect(wm.getState().currentZone).toBe('lobby');
    expect(wm.getState().ticksSinceLastChange).toBe(0);

    // Same position = no change
    wm.updatePosition(100, 200, 'lobby');
    expect(wm.getState().ticksSinceLastChange).toBe(1);
  });

  it('tracks idle state', () => {
    wm.updatePosition(100, 200, 'lobby');
    wm.updatePosition(100, 200, 'lobby');
    wm.updatePosition(100, 200, 'lobby');
    wm.updatePosition(100, 200, 'lobby');
    wm.updatePosition(100, 200, 'lobby'); // ticksSinceLastChange = 4, > 3
    expect(wm.isIdle()).toBe(true);
  });

  it('manages pending messages with limit', () => {
    for (let i = 0; i < 15; i++) {
      wm.addPendingMessage(`agent-${i}`, `msg ${i}`, 'proximity');
    }
    expect(wm.getState().pendingMessages).toHaveLength(10); // Capped at 10

    const consumed = wm.consumePendingMessages();
    expect(consumed).toHaveLength(10);
    expect(wm.getState().pendingMessages).toHaveLength(0);
  });
});

describe('EpisodicMemory', () => {
  const filePath = `${TEST_DIR}/episodic.jsonl`;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('adds and retrieves records', () => {
    const mem = new EpisodicMemory(filePath);
    const record = makeEpisode({ content: 'Saw a cat in the park' });
    mem.add(record);

    expect(mem.size()).toBe(1);
    expect(mem.getRecent(1)[0]?.content).toBe('Saw a cat in the park');
  });

  it('persists and loads from file', () => {
    const mem1 = new EpisodicMemory(filePath);
    mem1.add(makeEpisode({ content: 'First memory' }));
    mem1.add(makeEpisode({ content: 'Second memory' }));

    // Load from same file
    const mem2 = new EpisodicMemory(filePath);
    expect(mem2.size()).toBe(2);
    expect(mem2.getRecent(2).map(r => r.content)).toEqual(['First memory', 'Second memory']);
  });

  it('scores by recency + importance + relevance', () => {
    const mem = new EpisodicMemory(filePath);

    // Old but important
    mem.add(
      makeEpisode({
        content: 'Met Luna at the cafe',
        timestamp: Date.now() - 3600_000,
        importance: 9,
        participants: ['luna'],
      })
    );

    // Recent but low importance
    mem.add(
      makeEpisode({
        content: 'Walked around the lobby',
        timestamp: Date.now() - 1000,
        importance: 1,
      })
    );

    // Recent and relevant
    mem.add(
      makeEpisode({
        content: 'Luna said hello at the plaza',
        timestamp: Date.now() - 500,
        importance: 7,
        participants: ['luna'],
      })
    );

    const results = mem.search({ text: 'Luna', limit: 3 });
    expect(results.length).toBe(3);
    // Most relevant should be the recent Luna mention
    expect(results[0]?.record.content).toContain('Luna');
  });
});

describe('SemanticMemory', () => {
  const filePath = `${TEST_DIR}/semantic.json`;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('adds and retrieves by category', () => {
    const mem = new SemanticMemory(filePath);
    mem.add({
      category: 'world_knowledge',
      subject: 'cafe',
      content: 'The cafe is in the lounge zone',
      confidence: 0.8,
      sources: [],
    });

    const results = mem.getByCategory('world_knowledge');
    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('The cafe is in the lounge zone');
  });

  it('updates existing entries', () => {
    const mem = new SemanticMemory(filePath);
    const entry = mem.add({
      category: 'social_knowledge',
      subject: 'Luna',
      content: 'Luna is friendly',
      confidence: 0.6,
      sources: [],
    });

    mem.update(entry.id, { content: 'Luna is very friendly', confidence: 0.9 });

    const results = mem.getBySubject('Luna');
    expect(results[0]?.content).toBe('Luna is very friendly');
    expect(results[0]?.confidence).toBe(0.9);
  });

  it('persists to file', () => {
    const mem1 = new SemanticMemory(filePath);
    mem1.add({
      category: 'belief',
      subject: 'world',
      content: 'This world is interesting',
      confidence: 0.7,
      sources: [],
    });

    const mem2 = new SemanticMemory(filePath);
    expect(mem2.size()).toBe(1);
    expect(mem2.getByCategory('belief')[0]?.content).toBe('This world is interesting');
  });
});

describe('MemoryManager', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('integrates all memory tiers', () => {
    const manager = new MemoryManager(TEST_DIR);

    manager.addEpisode(makeEpisode({ content: 'Found the cafe', participants: ['sage'] }));
    manager.semantic.add({
      category: 'world_knowledge',
      subject: 'cafe',
      content: 'Cafe serves coffee',
      confidence: 0.9,
      sources: [],
    });

    const results = manager.retrieveRelevant('cafe', ['sage'], 5);
    expect(results.length).toBeGreaterThan(0);
  });

  it('provides memory stats', () => {
    const manager = new MemoryManager(TEST_DIR);
    manager.addEpisode(makeEpisode());
    manager.addEpisode(makeEpisode());

    const stats = manager.getStats();
    expect(stats.episodicCount).toBe(2);
    expect(stats.semanticCount).toBe(0);
  });
});
