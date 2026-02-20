/**
 * WorldPerception - Wraps AIC API for agent perception
 *
 * Translates raw API responses into agent-friendly TickContext data.
 */

import type { OpenClawWorldClient } from '@openclawworld/plugin';
import type {
  NearbyEntity,
  NearbyFacility,
  GameEvent,
  ChatMessageRecord,
} from '../types/agent.types.js';

export class WorldPerception {
  private eventCursor: string | null = null;

  constructor(
    private readonly client: OpenClawWorldClient,
    private readonly agentId: string,
    private readonly roomId: string
  ) {}

  async observe(radius = 15): Promise<{
    self: {
      id: string;
      name: string;
      position: { x: number; y: number };
      tile: { tx: number; ty: number };
      zone: string | null;
      facing: string;
    };
    nearby: NearbyEntity[];
    facilities: NearbyFacility[];
  }> {
    const result = await this.client.observe({
      agentId: this.agentId,
      roomId: this.roomId,
      radius,
      detail: 'full',
      includeSelf: true,
    });

    if (result.status === 'error') {
      throw new Error(`Observe failed: ${result.error.message}`);
    }

    const data = result.data;
    const self = {
      id: data.self.id,
      name: data.self.name,
      position: data.self.pos,
      tile: data.self.tile ?? {
        tx: Math.floor(data.self.pos.x / 16),
        ty: Math.floor(data.self.pos.y / 16),
      },
      zone: data.mapMetadata?.currentZone ?? null,
      facing: data.self.facing ?? 'down',
    };

    const nearby: NearbyEntity[] = data.nearby.map(e => ({
      id: e.entity.id,
      name: e.entity.name,
      kind: e.entity.kind,
      distance: e.distance,
      position: e.entity.pos,
      affordances: e.affords.map(a => a.action),
    }));

    const facilities: NearbyFacility[] = data.facilities.map(f => ({
      id: f.id,
      type: f.type,
      name: f.name,
      distance: f.distance,
      affordances: f.affords.map(a => a.action),
    }));

    return { self, nearby, facilities };
  }

  async pollEvents(limit = 20): Promise<GameEvent[]> {
    const result = await this.client.pollEvents({
      agentId: this.agentId,
      roomId: this.roomId,
      sinceCursor: this.eventCursor ?? undefined,
      limit,
      waitMs: 0,
    });

    if (result.status === 'error') {
      throw new Error(`PollEvents failed: ${result.error.message}`);
    }

    this.eventCursor = result.data.nextCursor;

    return result.data.events.map(e => ({
      type: e.type,
      timestamp: e.tsMs,
      payload: e.payload as Record<string, unknown>,
    }));
  }

  async getRecentChat(windowSec = 30): Promise<ChatMessageRecord[]> {
    const result = await this.client.chatObserve({
      agentId: this.agentId,
      roomId: this.roomId,
      windowSec,
    });

    if (result.status === 'error') {
      return [];
    }

    return result.data.messages
      .filter(m => m.fromEntityId !== this.agentId)
      .map(m => ({
        from: m.fromEntityId,
        fromName: m.fromName,
        message: m.message,
        channel: m.channel,
        timestamp: m.tsMs,
      }));
  }

  resetCursor(): void {
    this.eventCursor = null;
  }
}
