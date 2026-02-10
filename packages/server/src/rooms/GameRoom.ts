import colyseus from 'colyseus';
import type { Client } from 'colyseus';

const { Room } = colyseus;
import { RoomState } from '../schemas/RoomState.js';
import { EntitySchema } from '../schemas/EntitySchema.js';
import { GameMap } from '../schemas/GameMap.js';
import { MapLoader, MapLoadError } from '../map/MapLoader.js';
import { CollisionSystem } from '../collision/CollisionSystem.js';
import { ProximitySystem, type ProximityEvent } from '../proximity/ProximitySystem.js';
import {
  DEFAULT_PROXIMITY_RADIUS,
  PROXIMITY_DEBOUNCE_MS,
  EVENT_RETENTION_MS,
  EVENT_LOG_MAX_SIZE,
  DEFAULT_MOVE_SPEED,
} from '../constants.js';
import { EventLog } from '../events/EventLog.js';
import { MovementSystem } from '../movement/MovementSystem.js';
import type { EntityKind } from '@openclawworld/shared';

export class GameRoom extends Room<RoomState> {
  private clientEntities: Map<string, string> = new Map();
  private entityCounters: Map<EntityKind, number> = new Map([
    ['human', 0],
    ['agent', 0],
    ['object', 0],
  ]);
  private collisionSystem: CollisionSystem | null = null;
  private proximitySystem: ProximitySystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private recentProximityEvents: ProximityEvent[] = [];
  private mapLoader: MapLoader;
  private eventLog: EventLog;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.mapLoader = new MapLoader();
    this.eventLog = new EventLog(EVENT_RETENTION_MS, EVENT_LOG_MAX_SIZE);
  }

  override onCreate(options: { roomId?: string; mapId?: string; tickRate?: number }): void {
    const roomId = options.roomId ?? 'default';
    const mapId = options.mapId ?? 'lobby';
    const tickRate = options.tickRate ?? 20;

    let gameMap: GameMap | undefined;

    try {
      const parsedMap = this.mapLoader.loadMap(mapId);
      this.collisionSystem = new CollisionSystem(parsedMap);
      this.proximitySystem = new ProximitySystem(DEFAULT_PROXIMITY_RADIUS, PROXIMITY_DEBOUNCE_MS);
      this.movementSystem = new MovementSystem(this.collisionSystem, DEFAULT_MOVE_SPEED);
      gameMap = new GameMap(parsedMap.mapId, parsedMap.width, parsedMap.height, parsedMap.tileSize);
      console.log(
        `[GameRoom] Loaded map "${mapId}" (${parsedMap.width}x${parsedMap.height} tiles, ${parsedMap.tileSize}px each)`
      );
    } catch (error) {
      if (error instanceof MapLoadError) {
        console.error(`[GameRoom] ${error.message}`);
      } else {
        console.error(`[GameRoom] Unexpected error loading map "${mapId}":`, error);
      }
      throw error;
    }

    this.setState(new RoomState(roomId, mapId, tickRate, gameMap));
    this.setSimulationInterval(() => this.onTick(), 1000 / tickRate);

    this.onMessage('move_to', (client, message: { tx: number; ty: number }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId || !this.movementSystem) {
        return;
      }

      const result = this.movementSystem.setDestination(entityId, message.tx, message.ty);

      if (result === 'accepted') {
        console.log(`[GameRoom] Entity ${entityId} moving to (${message.tx}, ${message.ty})`);
      }
    });

    // Set up periodic cleanup of expired events (every minute)
    this.cleanupInterval = setInterval(() => {
      const removed = this.eventLog.cleanup();
      if (removed > 0) {
        console.log(`[GameRoom] Cleaned up ${removed} expired events`);
      }
    }, 60000);

    console.log(`[GameRoom] Created room ${roomId} with map ${mapId}, tick rate ${tickRate}`);
  }

  getCollisionSystem(): CollisionSystem | null {
    return this.collisionSystem;
  }

  getProximitySystem(): ProximitySystem | null {
    return this.proximitySystem;
  }

  getMovementSystem(): MovementSystem | null {
    return this.movementSystem;
  }

  getEventLog(): EventLog {
    return this.eventLog;
  }

  getRecentProximityEvents(): ProximityEvent[] {
    return this.recentProximityEvents;
  }

  clearRecentProximityEvents(): void {
    this.recentProximityEvents = [];
  }

  override onJoin(client: Client, options: { name?: string }): void {
    const name = options.name ?? `Player ${client.sessionId.slice(0, 6)}`;
    const entityId = this.generateEntityId('human');

    const entity = new EntitySchema(entityId, 'human', name, this.state.roomId);

    entity.setPosition(0, 0);
    entity.setTile(0, 0);

    this.state.addEntity(entity);
    this.clientEntities.set(client.sessionId, entityId);

    // Log presence.join event
    this.eventLog.append('presence.join', this.state.roomId, {
      entityId,
      name,
      kind: 'human',
    });

    console.log(`[GameRoom] Client ${client.sessionId} joined as ${entityId} (${name})`);
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const entityId = this.clientEntities.get(client.sessionId);

    if (entityId) {
      this.state.removeEntity(entityId, 'human');
      this.clientEntities.delete(client.sessionId);

      // Log presence.leave event
      const reason = consented ? 'disconnect' : 'disconnect';
      this.eventLog.append('presence.leave', this.state.roomId, {
        entityId,
        reason,
      });

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
    this.recentProximityEvents = [];

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private onTick(): void {
    const deltaMs = 1000 / this.state.tickRate;

    if (this.movementSystem) {
      const allEntities = this.state.getAllEntities();
      this.movementSystem.update(deltaMs, allEntities);
    }

    if (this.proximitySystem) {
      const allEntities = this.state.getAllEntities();
      const entityPositions = new Map<string, { id: string; x: number; y: number }>();

      allEntities.forEach(entity => {
        entityPositions.set(entity.id, {
          id: entity.id,
          x: entity.pos.x,
          y: entity.pos.y,
        });
      });

      const events = this.proximitySystem.update(entityPositions);
      this.recentProximityEvents.push(...events);

      // Store proximity events in EventLog
      for (const event of events) {
        if (event.type === 'proximity.enter') {
          this.eventLog.append('proximity.enter', this.state.roomId, event.payload);
        } else if (event.type === 'proximity.exit') {
          this.eventLog.append('proximity.exit', this.state.roomId, event.payload);
        }
      }
    }
  }

  private generateEntityId(kind: EntityKind): string {
    const counter = (this.entityCounters.get(kind) ?? 0) + 1;
    this.entityCounters.set(kind, counter);

    const prefix = kind === 'human' ? 'hum' : kind === 'agent' ? 'agt' : 'obj';
    return `${prefix}_${counter.toString().padStart(4, '0')}`;
  }
}
