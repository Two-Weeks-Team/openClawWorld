/**
 * EventProcessor - Processes game events and creates memory records
 */

import type { GameEvent, ChatMessageRecord } from '../types/agent.types.js';
import type { EpisodicRecord, EpisodicEventType } from '../types/memory.types.js';
import { randomUUID } from 'crypto';

export class EventProcessor {
  private readonly agentId: string;

  constructor(agentId: string, _agentName: string) {
    this.agentId = agentId;
  }

  processEvent(
    event: GameEvent,
    currentPosition: { x: number; y: number },
    currentZone: string | null,
    currentEmotion: { valence: number; arousal: number; dominance: number }
  ): EpisodicRecord | null {
    const payload = event.payload;

    switch (event.type) {
      case 'proximity.enter': {
        const otherId = payload['otherId'] as string | undefined;
        if (!otherId || otherId === this.agentId) return null;
        return this.createRecord(
          'encounter',
          `Noticed someone nearby`,
          [otherId],
          currentPosition,
          currentZone,
          currentEmotion,
          2
        );
      }

      case 'zone.enter': {
        const zoneId = payload['zoneId'] as string | undefined;
        return this.createRecord(
          'zone_change',
          `Entered ${zoneId ?? 'unknown zone'}`,
          [],
          currentPosition,
          currentZone,
          currentEmotion,
          3
        );
      }

      case 'chat.message': {
        const fromId = payload['fromEntityId'] as string | undefined;
        const message = payload['message'] as string | undefined;
        if (!fromId || fromId === this.agentId || !message) return null;
        return this.createRecord(
          'conversation',
          `Heard: "${message.slice(0, 200)}"`,
          [fromId],
          currentPosition,
          currentZone,
          currentEmotion,
          5
        );
      }

      case 'presence.join': {
        const name = payload['name'] as string | undefined;
        const entityId = payload['entityId'] as string | undefined;
        return this.createRecord(
          'event',
          `${name ?? 'Someone'} joined the world`,
          entityId ? [entityId] : [],
          currentPosition,
          currentZone,
          currentEmotion,
          2
        );
      }

      case 'presence.leave': {
        const entityId = payload['entityId'] as string | undefined;
        return this.createRecord(
          'event',
          `Someone left the world`,
          entityId ? [entityId] : [],
          currentPosition,
          currentZone,
          currentEmotion,
          1
        );
      }

      default:
        return null;
    }
  }

  chatToMemory(
    msg: ChatMessageRecord,
    currentPosition: { x: number; y: number },
    currentZone: string | null,
    currentEmotion: { valence: number; arousal: number; dominance: number }
  ): EpisodicRecord {
    return this.createRecord(
      'conversation',
      `${msg.fromName} said: "${msg.message.slice(0, 200)}"`,
      [msg.from],
      currentPosition,
      currentZone,
      currentEmotion,
      5
    );
  }

  private createRecord(
    type: EpisodicEventType,
    content: string,
    participants: string[],
    position: { x: number; y: number },
    zone: string | null,
    emotion: { valence: number; arousal: number; dominance: number },
    importance: number
  ): EpisodicRecord {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      type,
      content,
      participants,
      location: { zone, x: position.x, y: position.y },
      importance,
      emotionSnapshot: { ...emotion },
      tags: [type],
    };
  }
}
