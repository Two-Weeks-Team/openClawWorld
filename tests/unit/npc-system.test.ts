import { describe, it, expect, beforeEach } from 'vitest';
import { NPCSystem } from '../../packages/server/src/systems/NPCSystem.js';
import { NPCSchema } from '../../packages/server/src/schemas/NPCSchema.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import type { NpcDefinition } from '@openclawworld/shared';

describe('NPCSystem', () => {
  let npcSystem: NPCSystem;
  let eventLog: EventLog;
  const roomId = 'test-room';

  beforeEach(() => {
    npcSystem = new NPCSystem(12345);
    eventLog = new EventLog(60000, 1000);
  });

  describe('registerNPC', () => {
    it('registers an NPC with definition', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam the Greeter',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
      };

      npcSystem.registerNPC(npc, definition);

      expect(npcSystem.getNPC('npc-1')).toBe(npc);
      expect(npcSystem.getDefinition('npc-1')).toBe(definition);
    });

    it('registers NPC with startHour/endHour schedule format', () => {
      const npc = new NPCSchema('npc-2', 'ranger', 'Quinn', 'ranger');
      const definition: NpcDefinition = {
        id: 'ranger',
        name: 'Quinn the Ranger',
        zone: 'central-park',
        defaultPosition: { x: 500, y: 400 },
        schedule: [
          { startHour: 6, endHour: 18, state: 'patrolling', position: { x: 600, y: 500 } },
          { startHour: 18, endHour: 6, state: 'idle', position: { x: 500, y: 400 } },
        ],
      };

      npcSystem.registerNPC(npc, definition);

      expect(npcSystem.getNPC('npc-2')).toBeDefined();
      expect(npcSystem.getDefinition('npc-2')?.schedule).toHaveLength(2);
    });

    it('registers NPC with time string schedule format (legacy)', () => {
      const npc = new NPCSchema('npc-3', 'barista', 'Jamie', 'barista');
      const definition: NpcDefinition = {
        id: 'barista',
        name: 'Jamie the Barista',
        zone: 'lounge-cafe',
        defaultPosition: { x: 300, y: 200 },
        schedule: [
          { time: '09:00', state: 'working', location: { x: 300, y: 200 } },
        ],
      };

      npcSystem.registerNPC(npc, definition);

      expect(npcSystem.getNPC('npc-3')).toBeDefined();
    });
  });

  describe('unregisterNPC', () => {
    it('removes an NPC from the system', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.unregisterNPC('npc-1');

      expect(npcSystem.getNPC('npc-1')).toBeUndefined();
      expect(npcSystem.getDefinition('npc-1')).toBeUndefined();
    });
  });

  describe('transition', () => {
    it('changes NPC state and logs event', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      npc.currentState = 'idle';
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.transition('npc-1', 'walking', eventLog, roomId);

      expect(npc.currentState).toBe('walking');
    });

    it('does not transition if already in target state', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      npc.currentState = 'idle';
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.transition('npc-1', 'idle', eventLog, roomId);

      expect(npc.currentState).toBe('idle');
    });
  });

  describe('update with schedule', () => {
    it('transitions NPC based on hour range schedule', () => {
      const npc = new NPCSchema('npc-1', 'ranger', 'Quinn', 'ranger');
      npc.currentState = 'idle';
      const definition: NpcDefinition = {
        id: 'ranger',
        name: 'Quinn',
        zone: 'central-park',
        defaultPosition: { x: 500, y: 400 },
        schedule: [
          { startHour: 6, endHour: 18, state: 'patrolling', position: { x: 600, y: 500 } },
        ],
      };

      npcSystem.registerNPC(npc, definition);

      const gameTimeMs = 10 * 60000;
      npcSystem.update(gameTimeMs, eventLog, roomId);

      expect(npc.currentState).toBe('patrolling');
    });

    it('does not transition outside schedule hours', () => {
      const npc = new NPCSchema('npc-1', 'ranger', 'Quinn', 'ranger');
      npc.currentState = 'idle';
      const definition: NpcDefinition = {
        id: 'ranger',
        name: 'Quinn',
        zone: 'central-park',
        defaultPosition: { x: 500, y: 400 },
        schedule: [
          { startHour: 6, endHour: 18, state: 'patrolling', position: { x: 600, y: 500 } },
        ],
      };

      npcSystem.registerNPC(npc, definition);

      const gameTimeMs = 20 * 60000;
      npcSystem.update(gameTimeMs, eventLog, roomId);

      expect(npc.currentState).toBe('idle');
    });
  });

  describe('setTargetPosition', () => {
    it('sets target position for NPC movement', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      npc.currentState = 'walking';
      npc.x = 100;
      npc.y = 100;
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.setTargetPosition('npc-1', 200, 200);

      npcSystem.update(0, eventLog, roomId);

      expect(npc.x).toBeGreaterThan(100);
      expect(npc.y).toBeGreaterThan(100);
    });
  });

  describe('getAllNPCs', () => {
    it('returns all registered NPCs', () => {
      const npc1 = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      const npc2 = new NPCSchema('npc-2', 'ranger', 'Quinn', 'ranger');
      const def1: NpcDefinition = { id: 'greeter', name: 'Sam', zone: 'lobby', defaultPosition: { x: 0, y: 0 } };
      const def2: NpcDefinition = { id: 'ranger', name: 'Quinn', zone: 'central-park', defaultPosition: { x: 0, y: 0 } };

      npcSystem.registerNPC(npc1, def1);
      npcSystem.registerNPC(npc2, def2);

      const allNpcs = npcSystem.getAllNPCs();

      expect(allNpcs).toHaveLength(2);
      expect(allNpcs).toContain(npc1);
      expect(allNpcs).toContain(npc2);
    });
  });

  describe('handleWalking behavior', () => {
    it('moves NPC toward target position', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      npc.currentState = 'walking';
      npc.x = 0;
      npc.y = 0;
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 0, y: 0 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.setTargetPosition('npc-1', 100, 0);

      npcSystem.update(0, eventLog, roomId);

      expect(npc.x).toBeGreaterThan(0);
      expect(npc.facing).toBe('right');
    });

    it('updates facing direction based on movement', () => {
      const npc = new NPCSchema('npc-1', 'greeter', 'Sam', 'greeter');
      npc.currentState = 'walking';
      npc.x = 100;
      npc.y = 100;
      const definition: NpcDefinition = {
        id: 'greeter',
        name: 'Sam',
        zone: 'lobby',
        defaultPosition: { x: 100, y: 100 },
      };

      npcSystem.registerNPC(npc, definition);
      npcSystem.setTargetPosition('npc-1', 100, 0);

      npcSystem.update(0, eventLog, roomId);

      expect(npc.facing).toBe('up');
    });
  });

  describe('getSeed', () => {
    it('returns the random seed', () => {
      expect(npcSystem.getSeed()).toBe(12345);
    });
  });
});
