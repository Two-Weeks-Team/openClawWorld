/**
 * Personality System Tests - EmotionEngine, NeedsSystem, PersonalitySystem
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmotionEngine } from '../../../packages/ecosystem/src/personality/EmotionEngine.js';
import { NeedsSystem } from '../../../packages/ecosystem/src/personality/NeedsSystem.js';
import type { PersonalityTraits } from '../../../packages/ecosystem/src/types/agent.types.js';
import { existsSync, rmSync, mkdirSync } from 'fs';

const TEST_DIR = '/tmp/ecosystem-test-personality';

const LUNA_TRAITS: PersonalityTraits = {
  openness: 0.9,
  conscientiousness: 0.4,
  extraversion: 0.6,
  agreeableness: 0.7,
  neuroticism: 0.3,
};

const JINX_TRAITS: PersonalityTraits = {
  openness: 0.9,
  conscientiousness: 0.2,
  extraversion: 0.8,
  agreeableness: 0.3,
  neuroticism: 0.5,
};

describe('EmotionEngine', () => {
  it('initializes from personality traits', () => {
    const engine = new EmotionEngine(LUNA_TRAITS);
    const state = engine.getState();
    expect(state.valence).toBeGreaterThan(-1);
    expect(state.valence).toBeLessThan(1);
    expect(state.arousal).toBeGreaterThanOrEqual(0);
    expect(state.arousal).toBeLessThanOrEqual(1);
    expect(typeof state.label).toBe('string');
  });

  it('applies emotion deltas', () => {
    const engine = new EmotionEngine(LUNA_TRAITS);
    const before = engine.getState();

    engine.applyDelta({ valence: 0.3, arousal: 0.2, dominance: 0.1 });
    const after = engine.getState();

    expect(after.valence).toBeGreaterThan(before.valence);
    expect(after.arousal).toBeGreaterThan(before.arousal);
  });

  it('clamps values within bounds', () => {
    const engine = new EmotionEngine(LUNA_TRAITS);

    // Push to extremes
    engine.applyDelta({ valence: 5, arousal: 5, dominance: 5 });
    expect(engine.getState().valence).toBeLessThanOrEqual(1);
    expect(engine.getState().arousal).toBeLessThanOrEqual(1);
    expect(engine.getState().dominance).toBeLessThanOrEqual(1);

    engine.applyDelta({ valence: -10, arousal: -10, dominance: -10 });
    expect(engine.getState().valence).toBeGreaterThanOrEqual(-1);
    expect(engine.getState().arousal).toBeGreaterThanOrEqual(0);
    expect(engine.getState().dominance).toBeGreaterThanOrEqual(0);
  });

  it('decays toward baseline', () => {
    const engine = new EmotionEngine(LUNA_TRAITS);
    const baseline = engine.getState();

    // Push emotions far from baseline
    engine.applyDelta({ valence: 0.5, arousal: 0.3, dominance: 0.2 });
    const pushed = engine.getState();

    // Decay multiple times
    for (let i = 0; i < 20; i++) engine.decay();
    const decayed = engine.getState();

    // Should be closer to baseline than the pushed state
    expect(Math.abs(decayed.valence - baseline.valence)).toBeLessThan(
      Math.abs(pushed.valence - baseline.valence)
    );
  });

  it('different personalities have different baselines', () => {
    const lunaEngine = new EmotionEngine(LUNA_TRAITS);
    const jinxEngine = new EmotionEngine(JINX_TRAITS);

    const lunaState = lunaEngine.getState();
    const jinxState = jinxEngine.getState();

    // Luna (high agreeableness, low neuroticism) vs Jinx (low agreeableness, high neuroticism)
    // They should have different emotion profiles
    expect(lunaState.valence).not.toEqual(jinxState.valence);
  });
});

describe('NeedsSystem', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });

  it('starts with full needs', () => {
    const needs = new NeedsSystem();
    const state = needs.getState();
    expect(state.physiological).toBe(1);
    expect(state.safety).toBe(1);
    expect(state.belonging).toBe(1);
    expect(state.esteem).toBe(1);
    expect(state.selfActualization).toBe(1);
  });

  it('decays needs over time', () => {
    const needs = new NeedsSystem();

    for (let i = 0; i < 50; i++) needs.decay();
    const state = needs.getState();

    expect(state.physiological).toBeLessThan(1);
    expect(state.safety).toBeLessThan(1);
    expect(state.belonging).toBeLessThan(1);
  });

  it('satisfies needs from zone visits', () => {
    const needs = new NeedsSystem();

    // Deplete physiological
    for (let i = 0; i < 100; i++) needs.decay();
    const before = needs.getState().physiological;

    needs.satisfyFromZone('lounge-cafe');
    const after = needs.getState().physiological;

    expect(after).toBeGreaterThan(before);
  });

  it('satisfies needs from actions', () => {
    const needs = new NeedsSystem();

    for (let i = 0; i < 100; i++) needs.decay();
    const before = needs.getState().belonging;

    needs.satisfyFromAction('chat');
    const after = needs.getState().belonging;

    expect(after).toBeGreaterThan(before);
  });

  it('identifies most urgent need', () => {
    const needs = new NeedsSystem();

    // Heavily deplete physiological by many ticks
    for (let i = 0; i < 200; i++) needs.decay();

    const urgent = needs.getMostUrgentNeed();
    // Physiological decays fastest
    expect(urgent.need).toBe('physiological');
    expect(urgent.value).toBeLessThan(0.5);
  });

  it('suggests appropriate zone for urgent need', () => {
    const needs = new NeedsSystem();

    for (let i = 0; i < 200; i++) needs.decay();

    const zone = needs.suggestZone();
    expect(zone).toBeTruthy();
    // Should suggest cafe for physiological need
    expect(zone).toBe('lounge-cafe');
  });

  it('persists and loads state', () => {
    const path = `${TEST_DIR}/needs.json`;

    const needs1 = new NeedsSystem(path);
    for (let i = 0; i < 50; i++) needs1.decay();
    needs1.save();

    const needs2 = new NeedsSystem(path);
    expect(needs2.getState().physiological).toBeLessThan(1);
  });
});
