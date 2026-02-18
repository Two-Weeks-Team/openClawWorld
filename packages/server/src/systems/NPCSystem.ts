import { SeededRandom } from '../replay/seeded-random.js';
import { NPCSchema } from '../schemas/NPCSchema.js';
import { EventLog } from '../events/EventLog.js';
import type { NpcState, NpcDefinition, Facing } from '@openclawworld/shared';

export interface NPCScheduleEntry {
  startHour: number;
  endHour: number;
  state: NpcState;
  targetX?: number;
  targetY?: number;
}

export class NPCSystem {
  private npcs: Map<string, NPCSchema> = new Map();
  private definitions: Map<string, NpcDefinition> = new Map();
  private schedules: Map<string, NPCScheduleEntry[]> = new Map();
  private random: SeededRandom;
  private targetPositions: Map<string, { x: number; y: number }> = new Map();

  constructor(seed: number) {
    this.random = new SeededRandom(seed);
  }

  registerNPC(npc: NPCSchema, definition: NpcDefinition): void {
    this.npcs.set(npc.id, npc);
    this.definitions.set(npc.id, definition);

    if (definition.schedule) {
      const scheduleEntries: NPCScheduleEntry[] = definition.schedule.map(entry => {
        if ('startHour' in entry && 'endHour' in entry) {
          return {
            startHour: entry.startHour,
            endHour: entry.endHour,
            state: entry.state,
            targetX: entry.position?.x,
            targetY: entry.position?.y,
          };
        } else if ('time' in entry) {
          const [hour] = entry.time.split(':').map(Number);
          return {
            startHour: hour,
            endHour: hour + 1,
            state: entry.state,
            targetX: entry.location?.x,
            targetY: entry.location?.y,
          };
        }
        return { startHour: 0, endHour: 24, state: 'idle' as NpcState };
      });
      this.schedules.set(npc.id, scheduleEntries);
    }
  }

  unregisterNPC(npcId: string): void {
    this.npcs.delete(npcId);
    this.definitions.delete(npcId);
    this.schedules.delete(npcId);
    this.targetPositions.delete(npcId);
  }

  transition(npcId: string, newState: NpcState, eventLog: EventLog, roomId: string): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const oldState = npc.currentState;
    if (oldState === newState) return;

    npc.currentState = newState;

    eventLog.append('npc.state_change', roomId, {
      npcId,
      oldState,
      newState,
    });
  }

  update(gameTimeMs: number, eventLog: EventLog, roomId: string): void {
    for (const npc of this.npcs.values()) {
      this.updateNPC(npc, gameTimeMs, eventLog, roomId);
    }
  }

  private updateNPC(npc: NPCSchema, gameTimeMs: number, eventLog: EventLog, roomId: string): void {
    const schedule = this.schedules.get(npc.id);
    if (schedule) {
      const gameHour = Math.floor((gameTimeMs / 60000) % 24);

      for (const entry of schedule) {
        const isInTimeRange = gameHour >= entry.startHour && gameHour < entry.endHour;
        if (isInTimeRange && npc.currentState !== entry.state) {
          this.transition(npc.id, entry.state, eventLog, roomId);

          if (entry.targetX !== undefined && entry.targetY !== undefined) {
            this.targetPositions.set(npc.id, { x: entry.targetX, y: entry.targetY });
          }
          break;
        }
      }
    }

    switch (npc.currentState) {
      case 'walking':
        this.handleWalking(npc);
        break;
      case 'idle':
        this.handleIdle(npc);
        break;
    }
  }

  private handleWalking(npc: NPCSchema): void {
    const target = this.targetPositions.get(npc.id);
    if (target) {
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        this.targetPositions.delete(npc.id);
        return;
      }

      const speed = 2;
      const moveX = (dx / distance) * speed;
      const moveY = (dy / distance) * speed;

      npc.x += moveX;
      npc.y += moveY;

      this.updateFacingFromMovement(npc, moveX, moveY);
    } else {
      const randomMove = this.random.next();
      if (randomMove < 0.02) {
        const directions: Facing[] = ['up', 'down', 'left', 'right'];
        const direction = directions[Math.floor(this.random.next() * 4)];
        const moveAmount = 2;

        switch (direction) {
          case 'up':
            npc.y -= moveAmount;
            break;
          case 'down':
            npc.y += moveAmount;
            break;
          case 'left':
            npc.x -= moveAmount;
            break;
          case 'right':
            npc.x += moveAmount;
            break;
        }
        npc.facing = direction;
      }
    }
  }

  private handleIdle(npc: NPCSchema): void {
    if (this.random.next() < 0.01) {
      const directions: Facing[] = ['up', 'down', 'left', 'right'];
      npc.facing = directions[Math.floor(this.random.next() * 4)];
    }
  }

  private updateFacingFromMovement(npc: NPCSchema, moveX: number, moveY: number): void {
    if (Math.abs(moveX) > Math.abs(moveY)) {
      npc.facing = moveX > 0 ? 'right' : 'left';
    } else {
      npc.facing = moveY > 0 ? 'down' : 'up';
    }
  }

  getNPC(id: string): NPCSchema | undefined {
    return this.npcs.get(id);
  }

  getDefinition(id: string): NpcDefinition | undefined {
    return this.definitions.get(id);
  }

  getAllNPCs(): NPCSchema[] {
    return Array.from(this.npcs.values());
  }

  setTargetPosition(npcId: string, x: number, y: number): void {
    this.targetPositions.set(npcId, { x, y });
  }

  getSeed(): number {
    return this.random.getSeed();
  }
}
