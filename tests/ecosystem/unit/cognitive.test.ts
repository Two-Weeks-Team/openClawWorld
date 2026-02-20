/**
 * Cognitive Tests - DecisionParser, PromptBuilder
 */

import { describe, it, expect } from 'vitest';
import { DecisionParser } from '../../../packages/ecosystem/src/cognitive/DecisionParser.js';
import {
  getAgentTemplate,
  getAllTemplates,
} from '../../../packages/ecosystem/src/config/agent-templates.js';

describe('DecisionParser', () => {
  const parser = new DecisionParser();

  it('parses valid decision JSON', () => {
    const raw = JSON.stringify({
      thought: 'I should explore the park',
      action: { type: 'moveTo', dest: { tx: 25, ty: 30 }, reason: 'curious about the park' },
      emotionDelta: { valence: 0.1, arousal: 0.05, dominance: 0 },
      memoryNote: 'Decided to explore central park',
      importance: 5,
    });

    const decision = parser.parseDecision(raw);
    expect(decision.action.type).toBe('moveTo');
    expect(decision.thought).toBe('I should explore the park');
    expect(decision.importance).toBe(5);
    if (decision.action.type === 'moveTo') {
      expect(decision.action.dest).toEqual({ tx: 25, ty: 30 });
    }
  });

  it('parses JSON wrapped in code fences', () => {
    const raw =
      '```json\n{"thought":"thinking","action":{"type":"idle"},"emotionDelta":{"valence":0,"arousal":0,"dominance":0},"importance":1}\n```';

    const decision = parser.parseDecision(raw);
    expect(decision.action.type).toBe('idle');
    expect(decision.thought).toBe('thinking');
  });

  it('parses chat action', () => {
    const raw = JSON.stringify({
      thought: 'I want to say hello',
      action: { type: 'chat', channel: 'proximity', message: 'Hey Luna!', targetName: 'Luna' },
      emotionDelta: { valence: 0.1, arousal: 0.05, dominance: 0 },
      importance: 4,
    });

    const decision = parser.parseDecision(raw);
    expect(decision.action.type).toBe('chat');
    if (decision.action.type === 'chat') {
      expect(decision.action.message).toBe('Hey Luna!');
      expect(decision.action.targetName).toBe('Luna');
    }
  });

  it('falls back to idle on malformed JSON', () => {
    const raw = 'This is not JSON at all, just rambling text';
    const decision = parser.parseDecision(raw);
    expect(decision.action.type).toBe('idle');
    expect(decision.thought).toBeTruthy(); // Contains some fallback text
  });

  it('clamps emotion deltas within bounds', () => {
    const raw = JSON.stringify({
      thought: 'extreme emotions',
      action: { type: 'idle' },
      emotionDelta: { valence: 5.0, arousal: -10, dominance: 3.0 },
      importance: 1,
    });

    const decision = parser.parseDecision(raw);
    expect(decision.emotionDelta.valence).toBeLessThanOrEqual(0.3);
    expect(decision.emotionDelta.arousal).toBeGreaterThanOrEqual(-0.2);
    expect(decision.emotionDelta.dominance).toBeLessThanOrEqual(0.2);
  });

  it('handles reflect and observe actions', () => {
    const reflectRaw = JSON.stringify({
      thought: 'time to reflect',
      action: { type: 'reflect' },
      emotionDelta: { valence: 0, arousal: -0.1, dominance: 0 },
      importance: 3,
    });

    const decision = parser.parseDecision(reflectRaw);
    expect(decision.action.type).toBe('reflect');
  });

  it('parses reflection results', () => {
    const raw = JSON.stringify({
      insights: ['Luna seems friendly', 'The cafe is a good place to meet people'],
      updatedBeliefs: [
        {
          category: 'social_knowledge',
          subject: 'Luna',
          content: 'Luna is always curious and friendly',
          confidence: 0.8,
          sources: [],
        },
      ],
      relationshipUpdates: [
        {
          entityId: 'luna-id',
          closenessChange: 0.1,
          trustChange: 0.05,
          reason: 'positive interactions',
        },
      ],
      newGoal: 'Visit the arcade next',
      emotionAdjustment: { valence: 0.05, arousal: -0.02, dominance: 0 },
    });

    const result = parser.parseReflection(raw);
    expect(result.insights).toHaveLength(2);
    expect(result.updatedBeliefs).toHaveLength(1);
    expect(result.relationshipUpdates).toHaveLength(1);
    expect(result.newGoal).toBe('Visit the arcade next');
  });

  it('handles empty reflection gracefully', () => {
    const result = parser.parseReflection('not json');
    expect(result.insights).toHaveLength(0);
    expect(result.updatedBeliefs).toHaveLength(0);
    expect(result.relationshipUpdates).toHaveLength(0);
  });
});

describe('Agent Templates', () => {
  it('provides Luna template', () => {
    const luna = getAgentTemplate('luna');
    expect(luna).toBeTruthy();
    expect(luna?.name).toBe('Luna');
    expect(luna?.personality.openness).toBe(0.9);
  });

  it('provides Sage template', () => {
    const sage = getAgentTemplate('sage');
    expect(sage).toBeTruthy();
    expect(sage?.name).toBe('Sage');
    expect(sage?.personality.extraversion).toBe(0.3);
  });

  it('provides Jinx template', () => {
    const jinx = getAgentTemplate('jinx');
    expect(jinx).toBeTruthy();
    expect(jinx?.name).toBe('Jinx');
    expect(jinx?.personality.agreeableness).toBe(0.3);
  });

  it('returns all 3 templates', () => {
    const all = getAllTemplates();
    expect(all).toHaveLength(3);
  });

  it('is case-insensitive', () => {
    expect(getAgentTemplate('LUNA')).toBeTruthy();
    expect(getAgentTemplate('Luna')).toBeTruthy();
    expect(getAgentTemplate('luna')).toBeTruthy();
  });

  it('returns undefined for unknown template', () => {
    expect(getAgentTemplate('unknown')).toBeUndefined();
  });

  it('all templates have required fields', () => {
    for (const template of getAllTemplates()) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.backstory).toBeTruthy();
      expect(template.speakingStyle).toBeTruthy();
      expect(template.quirks.length).toBeGreaterThan(0);
      expect(template.preferredZones.length).toBeGreaterThan(0);

      // Personality traits in valid range
      const p = template.personality;
      for (const val of [
        p.openness,
        p.conscientiousness,
        p.extraversion,
        p.agreeableness,
        p.neuroticism,
      ]) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });
});
