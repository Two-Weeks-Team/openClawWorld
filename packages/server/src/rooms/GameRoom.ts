import colyseus from 'colyseus';
import type { Client } from 'colyseus';

const { Room } = colyseus;
import { RoomState } from '../schemas/RoomState.js';
import { EntitySchema } from '../schemas/EntitySchema.js';
import type { EntityKind } from '@openclawworld/shared';

export class GameRoom extends Room<RoomState> {
  private clientEntities: Map<string, string> = new Map();
  private entityCounters: Map<EntityKind, number> = new Map([
    ['human', 0],
    ['agent', 0],
    ['object', 0],
  ]);

  override onCreate(options: { roomId?: string; mapId?: string; tickRate?: number }): void {
    const roomId = options.roomId ?? 'default';
    const mapId = options.mapId ?? 'default-map';
    const tickRate = options.tickRate ?? 20;

    this.setState(new RoomState(roomId, mapId, tickRate));
    this.setSimulationInterval(() => this.onTick(), 1000 / tickRate);

    console.log(`[GameRoom] Created room ${roomId} with map ${mapId}, tick rate ${tickRate}`);
  }

  override onJoin(client: Client, options: { name?: string }): void {
    const name = options.name ?? `Player ${client.sessionId.slice(0, 6)}`;
    const entityId = this.generateEntityId('human');

    const entity = new EntitySchema(entityId, 'human', name, this.state.roomId);

    entity.setPosition(0, 0);
    entity.setTile(0, 0);

    this.state.addEntity(entity);
    this.clientEntities.set(client.sessionId, entityId);

    console.log(`[GameRoom] Client ${client.sessionId} joined as ${entityId} (${name})`);
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const entityId = this.clientEntities.get(client.sessionId);

    if (entityId) {
      this.state.removeEntity(entityId, 'human');
      this.clientEntities.delete(client.sessionId);

      console.log(`[GameRoom] Client ${client.sessionId} left, removed ${entityId}`);
    }

    if (!consented) {
      try {
        await this.allowReconnection(client, 20);
        console.log(`[GameRoom] Client ${client.sessionId} reconnected`);
      } catch {
        console.log(`[GameRoom] Client ${client.sessionId} did not reconnect in time`);
      }
    }
  }

  override onDispose(): void {
    console.log(`[GameRoom] Disposing room ${this.state.roomId}`);
    this.clientEntities.clear();
  }

  private onTick(): void {
  }

  private generateEntityId(kind: EntityKind): string {
    const counter = (this.entityCounters.get(kind) ?? 0) + 1;
    this.entityCounters.set(kind, counter);

    const prefix = kind === 'human' ? 'hum' : kind === 'agent' ? 'agt' : 'obj';
    return `${prefix}_${counter.toString().padStart(4, '0')}`;
  }
}
