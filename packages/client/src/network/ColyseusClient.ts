import { Client, Room } from '@colyseus/sdk';

import type appConfig from '../../../server/src/app.config.js';
import { EntitySchema } from '../generated/schemas/EntitySchema.js';
import { NPCSchema } from '../generated/schemas/NPCSchema.js';
import { RoomState } from '../generated/schemas/RoomState.js';
import type { SkillDefinition, SkillInvokeOutcome, InteractOutcome, ChannelInfo } from '@openclawworld/shared';

export type Entity = EntitySchema;
export type NPC = NPCSchema;
export type { RoomState };

export type SkillInvokeResult = {
  txId: string;
  outcome: SkillInvokeOutcome;
};

export type InteractResult = {
  txId: string;
  outcome: InteractOutcome;
};

export type InstalledSkill = {
  definition: SkillDefinition;
  lastUsedTime: number;
  enabled: boolean;
};

export type { ChannelInfo };

function getServerHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
}

function getServerPort(): string {
  return import.meta.env.VITE_SERVER_PORT ?? '2567';
}

function getServerEndpoint(): string {
  const hostname = getServerHostname();
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${hostname}:${getServerPort()}`;
}

function getHttpEndpoint(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${hostname}:${getServerPort()}`;
}

export class ColyseusClient {
  private client: Client<typeof appConfig>;
  private room: Room<Record<string, unknown>, RoomState> | null = null;
  private _sessionId: string | null = null;
  private _entityId: string | null = null;

  constructor(endpoint: string = getServerEndpoint()) {
    this.client = new Client<typeof appConfig>(endpoint);
  }

  async fetchChannels(): Promise<ChannelInfo[]> {
    const url = `${getHttpEndpoint()}/aic/v0.1/channels`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`[ColyseusClient] fetchChannels failed: status=${resp.status} url="${url}"`);
        return [];
      }
      const json = await resp.json();
      return json.data?.channels ?? [];
    } catch (error) {
      console.error('[ColyseusClient] fetchChannels failed:', `url="${url}"`, error);
      return [];
    }
  }

  async connect(name: string, roomId: string): Promise<Room<Record<string, unknown>, RoomState>> {
    try {
      this.room = await this.client.joinOrCreate<RoomState>('game', { name, roomId }, RoomState);
      this._sessionId = this.room.sessionId;

      this.room.onMessage('assignedEntityId', (data: { entityId: string }) => {
        this._entityId = data.entityId;
        console.log('Assigned entity ID:', this._entityId);
      });

      console.log('Joined room:', this.room.name, 'Session ID:', this.room.sessionId);
      return this.room;
    } catch (e) {
      console.error('Join error:', e);
      throw e;
    }
  }

  disconnect() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  moveTo(tx: number, ty: number) {
    if (this.room) {
      this.room.send('move_to', { tx, ty });
    }
  }

  sendEmote(emoteType: string): void {
    if (this.room) {
      this.room.send('emote', { emoteType });
    }
  }

  get sessionId() {
    return this._sessionId;
  }

  get entityId() {
    return this._entityId;
  }

  get currentRoom() {
    return this.room;
  }

  getMyEntity() {
    if (!this.room || !this._entityId) return undefined;
    const state = this.room.state;
    return (
      state.humans.get(this._entityId) ||
      state.agents.get(this._entityId) ||
      state.objects.get(this._entityId)
    );
  }

  findEntity(id: string) {
    if (!this.room) return undefined;
    const state = this.room.state;
    return state.humans.get(id) || state.agents.get(id) || state.objects.get(id);
  }

  invokeSkill(
    skillId: string,
    actionId: string,
    targetId?: string,
    params?: Record<string, unknown>
  ): void {
    if (this.room) {
      this.room.send('skill_invoke', {
        skillId,
        actionId,
        targetId,
        params,
      });
    }
  }

  cancelSkill(): void {
    if (this.room) {
      this.room.send('skill_cancel', {});
    }
  }

  interact(targetId: string, action: string, params?: Record<string, unknown>): void {
    if (this.room) {
      this.room.send('interact', { targetId, action, params: params ?? {} });
    }
  }

  onInteractResult(callback: (result: InteractResult) => void): () => void {
    if (!this.room) return () => {};
    return this.room.onMessage('interact.result', callback);
  }

  onSkillEvent(
    callback: (event: {
      type: string;
      txId?: string;
      skillId?: string;
      actionId?: string;
      casterId?: string;
      targetId?: string;
      effectInstanceId?: string;
      completionTime?: number;
      reason?: string;
    }) => void
  ): () => void {
    if (!this.room) return () => {};

    const handlers = [
      'skill.cast_started',
      'skill.cast_complete',
      'skill.cast_cancelled',
      'skill.cast_failed',
      'effect.applied',
      'effect.refreshed',
      'effect.expired',
    ];

    const unsubscribers: (() => void)[] = [];
    for (const eventType of handlers) {
      const unsub = this.room.onMessage(eventType, (data: Record<string, unknown>) => {
        callback({ type: eventType, ...data } as Parameters<typeof callback>[0]);
      });
      unsubscribers.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }
}

export const gameClient = new ColyseusClient();
