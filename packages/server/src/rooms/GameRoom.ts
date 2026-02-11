import { Room, type Client } from 'colyseus';
import { resolve } from 'path';
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
import { ChatSystem } from '../chat/ChatSystem.js';
import { ProfileService } from '../profile/ProfileService.js';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS, type ZoneBounds } from '../zone/ZoneSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { FacilityService } from '../services/FacilityService.js';
import { registerAllFacilityHandlers, FACILITY_AFFORDANCES } from '../facilities/index.js';
import { FacilitySchema } from '../schemas/FacilitySchema.js';
import { PermissionService } from '../services/PermissionService.js';
import { SafetyService } from '../services/SafetyService.js';
import { AuditLog } from '../audit/AuditLog.js';
import type { EntityKind, UserStatus, ZoneId } from '@openclawworld/shared';
import { getMetricsCollector } from '../metrics/MetricsCollector.js';
import { WorldPackLoader, WorldPackError, type WorldPack } from '../world/WorldPackLoader.js';

const DEFAULT_NPC_SEED = 12345;
const DEFAULT_WORLD_PACK_PATH = resolve(process.cwd(), 'world/packs/base');

export class GameRoom extends Room<{ state: RoomState }> {
  declare state: RoomState;
  private clientEntities: Map<string, string> = new Map();
  private entityCounters: Map<EntityKind, number> = new Map([
    ['human', 0],
    ['agent', 0],
    ['object', 0],
  ]);
  private collisionSystem: CollisionSystem | null = null;
  private proximitySystem: ProximitySystem | null = null;
  private movementSystem: MovementSystem | null = null;
  private chatSystem: ChatSystem | null = null;
  private zoneSystem: ZoneSystem | null = null;
  private npcSystem: NPCSystem | null = null;
  private profileService: ProfileService;
  private facilityService!: FacilityService;
  private permissionService!: PermissionService;
  private safetyService: SafetyService;
  private auditLog: AuditLog;
  private gameTimeMs: number = 0;
  private recentProximityEvents: ProximityEvent[] = [];
  private mapLoader: MapLoader;
  private worldPackLoader: WorldPackLoader | null = null;
  private worldPack: WorldPack | null = null;
  private eventLog: EventLog;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private spawnPoint: { x: number; y: number; tx: number; ty: number } = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
  };

  constructor() {
    super();
    this.mapLoader = new MapLoader();
    this.eventLog = new EventLog(EVENT_RETENTION_MS, EVENT_LOG_MAX_SIZE);
    this.chatSystem = new ChatSystem();
    this.profileService = new ProfileService();
    this.safetyService = new SafetyService();
    this.auditLog = new AuditLog();
    this.safetyService.setAuditLog(this.auditLog);
    this.chatSystem.setSafetyService(this.safetyService);
  }

  override onCreate(options: {
    roomId?: string;
    mapId?: string;
    tickRate?: number;
    packPath?: string;
  }): void {
    const roomId = options.roomId ?? 'default';
    const mapId = options.mapId ?? 'lobby';
    const tickRate = options.tickRate ?? 20;
    const packPath = options.packPath ?? DEFAULT_WORLD_PACK_PATH;

    let gameMap: GameMap | undefined;

    this.loadWorldPack(packPath);

    try {
      const parsedMap = this.loadMapFromPackOrFallback(mapId);
      this.collisionSystem = new CollisionSystem(parsedMap);
      this.proximitySystem = new ProximitySystem(DEFAULT_PROXIMITY_RADIUS, PROXIMITY_DEBOUNCE_MS);
      this.movementSystem = new MovementSystem(this.collisionSystem, DEFAULT_MOVE_SPEED);
      this.initializeZoneSystem();
      this.npcSystem = new NPCSystem(DEFAULT_NPC_SEED);
      gameMap = new GameMap(parsedMap.mapId, parsedMap.width, parsedMap.height, parsedMap.tileSize);

      this.findAndSetSpawnPoint(parsedMap, mapId as ZoneId);

      console.log(
        `[GameRoom] Loaded map "${mapId}" (${parsedMap.width}x${parsedMap.height} tiles, ${parsedMap.tileSize}px each)`
      );
    } catch (error) {
      if (error instanceof MapLoadError) {
        console.error(`[GameRoom] ${error.message}`);
      } else if (error instanceof WorldPackError) {
        console.error(`[GameRoom] ${error.message}`);
      } else {
        console.error(`[GameRoom] Unexpected error loading map "${mapId}":`, error);
      }
      throw error;
    }

    this.setState(new RoomState(roomId, mapId, tickRate, gameMap));
    this.facilityService = new FacilityService(this.state);
    registerAllFacilityHandlers(this.facilityService);
    this.loadFacilitiesFromWorldPack();
    this.permissionService = new PermissionService(this.state);
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

    this.onMessage('chat', (client, message: { message: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId || !this.chatSystem) return;

      const entity = this.state.getEntity(entityId);
      if (!entity) return;

      this.chatSystem.sendMessage(
        this.state.roomId,
        'global',
        entityId,
        entity.name,
        message.message
      );

      this.broadcast('chat', {
        from: entity.name,
        message: message.message,
        entityId: entityId,
      });
    });

    this.onMessage(
      'profile_update',
      (client, data: { status?: UserStatus; statusMessage?: string }) => {
        const entityId = this.clientEntities.get(client.sessionId);
        if (!entityId) return;

        const entity = this.state.getEntity(entityId);
        if (!entity) return;

        this.profileService.updateProfile(entity, data);

        this.eventLog.append('profile.updated', this.state.roomId, {
          entityId,
          status: data.status,
          statusMessage: data.statusMessage,
        });
      }
    );

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

  getZoneSystem(): ZoneSystem | null {
    return this.zoneSystem;
  }

  getNPCSystem(): NPCSystem | null {
    return this.npcSystem;
  }

  getChatSystem(): ChatSystem | null {
    return this.chatSystem;
  }

  getProfileService(): ProfileService {
    return this.profileService;
  }

  getFacilityService(): FacilityService {
    return this.facilityService;
  }

  getPermissionService(): PermissionService {
    return this.permissionService;
  }

  getSafetyService(): SafetyService {
    return this.safetyService;
  }

  getAuditLog(): AuditLog {
    return this.auditLog;
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

    entity.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    entity.setTile(this.spawnPoint.tx, this.spawnPoint.ty);

    this.state.addEntity(entity);
    this.clientEntities.set(client.sessionId, entityId);
    client.send('assignedEntityId', { entityId });

    this.eventLog.append('presence.join', this.state.roomId, {
      entityId,
      name,
      kind: 'human',
    });

    console.log(
      `[GameRoom] Client ${client.sessionId} joined as ${entityId} (${name}) at spawn (${this.spawnPoint.tx}, ${this.spawnPoint.ty})`
    );
  }

  override async onLeave(client: Client, code?: number): Promise<void> {
    const entityId = this.clientEntities.get(client.sessionId);
    const consented = code === undefined;

    if (entityId) {
      if (this.zoneSystem) {
        this.zoneSystem.removeEntity(entityId, this.eventLog, this.state.roomId);
      }

      this.state.removeEntity(entityId, 'human');
      this.clientEntities.delete(client.sessionId);

      const reason = consented ? 'consented' : 'disconnected';
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
    const tickStart = performance.now();
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

      for (const event of events) {
        if (event.type === 'proximity.enter') {
          this.eventLog.append('proximity.enter', this.state.roomId, event.payload);
        } else if (event.type === 'proximity.exit') {
          this.eventLog.append('proximity.exit', this.state.roomId, event.payload);
        }
      }
    }

    if (this.zoneSystem) {
      const allEntities = this.state.getAllEntities();
      this.zoneSystem.update(allEntities, this.eventLog, this.state.roomId);
    }

    if (this.npcSystem) {
      this.gameTimeMs += deltaMs;
      this.npcSystem.update(this.gameTimeMs, this.eventLog, this.state.roomId);
    }

    const tickTime = performance.now() - tickStart;
    const metricsCollector = getMetricsCollector();
    metricsCollector.recordTick(tickTime);
    metricsCollector.setEventQueueDepth(this.eventLog.getSize());
    metricsCollector.setConnectionCount(this.clientEntities.size);
  }

  private generateEntityId(kind: EntityKind): string {
    const counter = (this.entityCounters.get(kind) ?? 0) + 1;
    this.entityCounters.set(kind, counter);

    const prefix = kind === 'human' ? 'hum' : kind === 'agent' ? 'agt' : 'obj';
    return `${prefix}_${counter.toString().padStart(4, '0')}`;
  }

  private loadWorldPack(packPath: string): void {
    try {
      this.worldPackLoader = new WorldPackLoader(packPath);
      this.worldPack = this.worldPackLoader.loadPack();

      const manifest = this.worldPack.manifest;
      console.log(
        `[GameRoom] Loaded world pack "${manifest.name}" v${manifest.version} with ${this.worldPack.maps.size} zones`
      );

      for (const [zoneId, zoneMap] of this.worldPack.maps) {
        console.log(
          `[GameRoom]   Zone: ${zoneId} (${zoneMap.name}) - ${zoneMap.npcs.length} NPCs, ${zoneMap.facilities.length} facilities`
        );
      }
    } catch (error) {
      if (error instanceof WorldPackError) {
        console.warn(`[GameRoom] Failed to load world pack: ${error.message}, using fallback`);
      } else {
        console.warn(
          `[GameRoom] Unexpected error loading world pack: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      this.worldPackLoader = null;
      this.worldPack = null;
    }
  }

  private loadMapFromPackOrFallback(mapId: string): import('@openclawworld/shared').ParsedMap {
    if (this.worldPack && this.worldPackLoader) {
      const zoneMapData = this.worldPack.maps.get(mapId as ZoneId);
      if (zoneMapData) {
        return this.mapLoader.loadZoneMapFromData(zoneMapData);
      }
    }

    return this.mapLoader.loadMap(mapId);
  }

  private initializeZoneSystem(): void {
    if (this.worldPack) {
      const zoneBounds = new Map<ZoneId, ZoneBounds>();

      for (const [zoneId, zoneMap] of this.worldPack.maps) {
        zoneBounds.set(zoneId, zoneMap.bounds);
      }

      if (zoneBounds.size > 0) {
        this.zoneSystem = new ZoneSystem(zoneBounds);
        console.log(
          `[GameRoom] Initialized ZoneSystem with ${zoneBounds.size} zones from world pack`
        );
        return;
      }
    }

    this.zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    console.log('[GameRoom] Initialized ZoneSystem with default zone bounds');
  }

  private findAndSetSpawnPoint(
    parsedMap: import('@openclawworld/shared').ParsedMap,
    zoneId: ZoneId
  ): void {
    if (this.worldPack) {
      const zoneMap = this.worldPack.maps.get(zoneId);
      if (zoneMap && zoneMap.spawnPoints.length > 0) {
        const spawn = zoneMap.spawnPoints[0];
        this.spawnPoint = {
          x: spawn.x,
          y: spawn.y,
          tx: Math.floor(spawn.x / parsedMap.tileSize),
          ty: Math.floor(spawn.y / parsedMap.tileSize),
        };
        return;
      }
    }

    const spawnObj = parsedMap.objects.find(obj => {
      const typeProp = obj.properties?.find(p => p.name === 'type');
      return typeProp?.value === 'spawn' || obj.type === 'spawn' || obj.name === 'spawn';
    });

    if (spawnObj) {
      this.spawnPoint = {
        x: spawnObj.x + 16,
        y: spawnObj.y + 16,
        tx: Math.floor(spawnObj.x / parsedMap.tileSize),
        ty: Math.floor(spawnObj.y / parsedMap.tileSize),
      };
    }
  }

  getWorldPack(): WorldPack | null {
    return this.worldPack;
  }

  getWorldPackLoader(): WorldPackLoader | null {
    return this.worldPackLoader;
  }

  private loadFacilitiesFromWorldPack(): void {
    if (!this.worldPack) {
      return;
    }

    let loadedCount = 0;
    for (const facilityDef of this.worldPack.facilities) {
      const affordances = FACILITY_AFFORDANCES[facilityDef.type] ?? [];
      const facility = new FacilitySchema(
        facilityDef.id,
        facilityDef.type,
        facilityDef.zone,
        facilityDef.position.x,
        facilityDef.position.y
      );
      facility.setAffordances(affordances);
      this.facilityService.registerFacility(facility);
      loadedCount++;
    }

    console.log(`[GameRoom] Registered ${loadedCount} facilities from world pack`);
  }
}
