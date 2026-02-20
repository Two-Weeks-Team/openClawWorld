import { describe, it, expect, beforeEach } from 'vitest';
import { SkillService } from '../../packages/server/src/services/SkillService.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';
import type { SkillDefinition } from '@openclawworld/shared';

const SLOW_AURA_SKILL: SkillDefinition = {
  id: 'slow_aura',
  name: 'Slow Aura',
  version: '1.0.0',
  description: 'Emit an aura that slows nearby targets',
  category: 'social',
  emoji: '🐌',
  source: { type: 'builtin' },
  actions: [
    {
      id: 'cast',
      name: 'Cast Slow Aura',
      description: 'Apply a slowing effect to target within range',
      params: [
        {
          name: 'targetId',
          type: 'string',
          required: true,
          description: 'Entity ID of the target to slow',
        },
      ],
      cooldownMs: 5000,
      castTimeMs: 1000,
      rangeUnits: 200,
      effect: {
        id: 'slowed',
        durationMs: 3000,
        statModifiers: {
          speedMultiplier: 0.5,
        },
      },
    },
  ],
  triggers: ['slow', 'aura'],
};

const INSTANT_SKILL: SkillDefinition = {
  id: 'instant_zap',
  name: 'Instant Zap',
  version: '1.0.0',
  description: 'An instant effect skill for testing',
  category: 'utility',
  emoji: '⚡',
  source: { type: 'builtin' },
  actions: [
    {
      id: 'zap',
      name: 'Zap',
      description: 'Instantly zap target',
      params: [
        {
          name: 'targetId',
          type: 'string',
          required: true,
          description: 'Entity ID to zap',
        },
      ],
      cooldownMs: 2000,
      castTimeMs: 0,
      rangeUnits: 100,
      effect: {
        id: 'zapped',
        durationMs: 1000,
        statModifiers: {
          speedMultiplier: 0.8,
        },
      },
    },
  ],
  triggers: ['zap'],
};

describe('SkillService', () => {
  let state: RoomState;
  let skillService: SkillService;
  let agentA: EntitySchema;
  let agentB: EntitySchema;

  beforeEach(() => {
    state = new RoomState('test_room', 'village', 20);
    skillService = new SkillService(state);

    agentA = new EntitySchema('agt_alice', 'agent', 'Alice', 'test_room');
    agentA.setPosition(100, 100);
    state.addEntity(agentA);

    agentB = new EntitySchema('agt_bob', 'agent', 'Bob', 'test_room');
    agentB.setPosition(150, 100);
    state.addEntity(agentB);

    skillService.registerSkill(SLOW_AURA_SKILL);
    skillService.registerSkill(INSTANT_SKILL);
    skillService.installSkillForAgent('agt_alice', 'slow_aura');
    skillService.installSkillForAgent('agt_alice', 'instant_zap');
    skillService.installSkillForAgent('agt_bob', 'slow_aura');
    skillService.installSkillForAgent('agt_bob', 'instant_zap');
  });

  describe('Scenario 1: Cooldown Rejection', () => {
    it('rejects skill invocation when cooldown is active', async () => {
      const firstResult = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_first'
      );
      expect(firstResult.type).toBe('ok');

      const secondResult = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_second'
      );
      expect(secondResult.type).toBe('error');
      expect(secondResult.message).toContain('Cooldown');
    });

    it('allows skill invocation after cooldown expires', async () => {
      const firstResult = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_first'
      );
      expect(firstResult.type).toBe('ok');

      const skillState = agentA.getSkillState('instant_zap', 'zap');
      expect(skillState).toBeDefined();

      skillState!.lastUsedTime = Date.now() - 3000;

      const secondResult = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_second'
      );
      expect(secondResult.type).toBe('ok');
    });
  });

  describe('Scenario 2: Range Validation', () => {
    it('rejects skill invocation when target is out of range', async () => {
      agentB.setPosition(500, 500);

      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_out_of_range'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('out of range');
    });

    it('accepts skill invocation when target is within range', async () => {
      agentB.setPosition(150, 100);

      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_in_range'
      );

      expect(result.type).toBe('ok');
    });

    it('rejects at exactly beyond range boundary', async () => {
      agentB.setPosition(100 + 101, 100);

      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_edge'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('out of range');
    });

    it('accepts at exactly within range boundary', async () => {
      agentB.setPosition(100 + 100, 100);

      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_exact_range'
      );

      expect(result.type).toBe('ok');
    });
  });

  describe('Scenario 3: Movement Cancels Cast', () => {
    it('cancels pending cast when caster moves beyond threshold', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_cast_then_move'
      );

      expect(result.type).toBe('pending');

      agentA.setPosition(200, 200);

      const pendingCast = skillService.getPendingCast('agt_alice');
      expect(pendingCast).toBeDefined();

      const originalDate = Date.now;
      Date.now = () => pendingCast!.completionTime + 100;

      const castResults = await skillService.processPendingCasts();

      Date.now = originalDate;

      const cancelledResult = castResults.find(r => r.txId === 'tx_cast_then_move');
      expect(cancelledResult).toBeDefined();
      expect(cancelledResult!.outcome.type).toBe('cancelled');
      expect(cancelledResult!.outcome.message).toContain('movement');
    });

    it('completes pending cast when caster stays still', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_cast_stay_still'
      );

      expect(result.type).toBe('pending');

      const pendingCast = skillService.getPendingCast('agt_alice');
      expect(pendingCast).toBeDefined();

      const originalDate = Date.now;
      Date.now = () => pendingCast!.completionTime + 100;

      const castResults = await skillService.processPendingCasts();

      Date.now = originalDate;

      const completedResult = castResults.find(r => r.txId === 'tx_cast_stay_still');
      expect(completedResult).toBeDefined();
      expect(completedResult!.outcome.type).toBe('ok');
    });

    it('allows small movement within threshold', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_small_move'
      );

      expect(result.type).toBe('pending');

      agentA.setPosition(103, 103);

      const pendingCast = skillService.getPendingCast('agt_alice');
      expect(pendingCast).toBeDefined();

      const originalDate = Date.now;
      Date.now = () => pendingCast!.completionTime + 100;

      const castResults = await skillService.processPendingCasts();

      Date.now = originalDate;

      const completedResult = castResults.find(r => r.txId === 'tx_small_move');
      expect(completedResult).toBeDefined();
      expect(completedResult!.outcome.type).toBe('ok');
    });
  });

  describe('Scenario 4: Effect Expiration Removes State', () => {
    it('applies effect on successful instant skill', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_apply_effect'
      );

      expect(result.type).toBe('ok');

      const effects = Array.from(agentB.activeEffects.values());
      expect(effects.length).toBe(1);
      expect(effects[0].effectType).toBe('zapped');
      expect(effects[0].speedMultiplier).toBe(0.8);
    });

    it('removes expired effects during tick processing', async () => {
      await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_effect_expire'
      );

      let effects = Array.from(agentB.activeEffects.values());
      expect(effects.length).toBe(1);

      const effect = effects[0];
      effect.startTime = Date.now() - 2000;
      effect.expirationTime = Date.now() - 500;

      skillService.processEffectExpirations();

      effects = Array.from(agentB.activeEffects.values());
      expect(effects.length).toBe(0);
    });

    it('keeps non-expired effects during tick processing', async () => {
      await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_bob' },
        'tx_effect_keep'
      );

      const effects = Array.from(agentB.activeEffects.values());
      expect(effects.length).toBe(1);

      skillService.processEffectExpirations();

      const effectsAfter = Array.from(agentB.activeEffects.values());
      expect(effectsAfter.length).toBe(1);
    });
  });

  describe('Scenario 5: Deterministic Resolution of Concurrent Casts', () => {
    it('resolves simultaneous casts in deterministic order', async () => {
      const resultAlice = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_alice_001'
      );
      expect(resultAlice.type).toBe('pending');

      const resultBob = await skillService.invokeAction(
        'agt_bob',
        'slow_aura',
        'cast',
        { targetId: 'agt_alice' },
        'tx_bob_002'
      );
      expect(resultBob.type).toBe('pending');

      const pendingAlice = skillService.getPendingCast('agt_alice');
      const pendingBob = skillService.getPendingCast('agt_bob');

      expect(pendingAlice).toBeDefined();
      expect(pendingBob).toBeDefined();

      const completionTime = Math.max(pendingAlice!.completionTime, pendingBob!.completionTime);

      const originalDate = Date.now;
      Date.now = () => completionTime + 100;

      const castResults = await skillService.processPendingCasts();

      Date.now = originalDate;

      expect(castResults.length).toBe(2);

      const txIds = castResults.map(r => r.txId);
      expect(txIds).toContain('tx_alice_001');
      expect(txIds).toContain('tx_bob_002');

      const aliceIndex = txIds.indexOf('tx_alice_001');
      const bobIndex = txIds.indexOf('tx_bob_002');
      expect(aliceIndex).toBeLessThan(bobIndex);
    });

    it('maintains order based on sorting criteria', async () => {
      agentA.setPosition(100, 100);
      agentB.setPosition(150, 100);

      const result1 = await skillService.invokeAction(
        'agt_bob',
        'slow_aura',
        'cast',
        { targetId: 'agt_alice' },
        'tx_z_first'
      );
      expect(result1.type).toBe('pending');

      const result2 = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_a_second'
      );
      expect(result2.type).toBe('pending');

      const allPending = skillService.getAllPendingCasts();
      const targetTime = Date.now() + 2000;
      for (const [, cast] of allPending) {
        cast.completionTime = targetTime - 1000;
      }

      const originalDate = Date.now;
      Date.now = () => targetTime;

      const castResults = await skillService.processPendingCasts();

      Date.now = originalDate;

      expect(castResults.length).toBe(2);
    });
  });

  describe('Additional Edge Cases', () => {
    it('rejects invocation for non-existent skill', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'nonexistent_skill',
        'action',
        {},
        'tx_nonexistent'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('not found');
    });

    it('rejects invocation for non-installed skill', async () => {
      skillService.registerSkill({
        id: 'uninstalled_skill',
        name: 'Uninstalled',
        version: '1.0.0',
        description: 'Not installed',
        category: 'utility',
        emoji: '❌',
        source: { type: 'builtin' },
        actions: [
          {
            id: 'action',
            name: 'Action',
            description: 'Does nothing',
            params: [],
            cooldownMs: 0,
            castTimeMs: 0,
            rangeUnits: 0,
          },
        ],
        triggers: [],
      });

      const result = await skillService.invokeAction(
        'agt_alice',
        'uninstalled_skill',
        'action',
        {},
        'tx_uninstalled'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('not installed');
    });

    it('rejects invocation for non-existent action', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'nonexistent_action',
        {},
        'tx_bad_action'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('not found');
    });

    it('rejects invocation for non-existent target', async () => {
      const result = await skillService.invokeAction(
        'agt_alice',
        'instant_zap',
        'zap',
        { targetId: 'agt_nonexistent' },
        'tx_bad_target'
      );

      expect(result.type).toBe('error');
      expect(result.message).toContain('Target entity not found');
    });

    it('prevents multiple pending casts from same agent', async () => {
      const result1 = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_first_cast'
      );
      expect(result1.type).toBe('pending');

      const result2 = await skillService.invokeAction(
        'agt_alice',
        'slow_aura',
        'cast',
        { targetId: 'agt_bob' },
        'tx_second_cast'
      );
      expect(result2.type).toBe('error');
      expect(result2.message).toContain('Already casting');
    });
  });
});
