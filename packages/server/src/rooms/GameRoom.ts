import { Room, type Client } from 'colyseus';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
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
  AGENT_TIMEOUT_MS,
  AGENT_CLEANUP_INTERVAL_MS,
  MAX_CHANNEL_OCCUPANCY,
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
import { NPCSchema } from '../schemas/NPCSchema.js';
import { PermissionService } from '../services/PermissionService.js';
import { SafetyService } from '../services/SafetyService.js';
import { AuditLog } from '../audit/AuditLog.js';
import type {
  EntityKind,
  UserStatus,
  ZoneId,
  SkillDefinition,
  InteractOutcome,
  DialogueTree,
} from '@openclawworld/shared';
import { DEFAULT_SPAWN_POINT } from '@openclawworld/shared';
import { getMetricsCollector } from '../metrics/MetricsCollector.js';
import { WorldPackLoader, WorldPackError, type WorldPack } from '../world/WorldPackLoader.js';
import { SkillService } from '../services/SkillService.js';
import { registerRoom, unregisterRoom } from '../aic/roomRegistry.js';

const DEFAULT_NPC_SEED = 12345;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_WORLD_PACK_PATH = resolve(__dirname, '../../../../world/packs/base');

type DialogueState = {
  npcId: string;
  currentNodeId: string;
};

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
  private staleAgentCleanupInterval: NodeJS.Timeout | null = null;
  private skillService: SkillService | null = null;
  private spawnPoint: { x: number; y: number; tx: number; ty: number } = { ...DEFAULT_SPAWN_POINT };
  private dialogueStates: Map<string, DialogueState> = new Map();

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
    const tickRate = options.tickRate ?? 20;
    const packPath = options.packPath ?? DEFAULT_WORLD_PACK_PATH;

    this.autoDispose = false;

    let gameMap: GameMap | undefined;

    // Load world pack first to get entryZone for default mapId
    this.loadWorldPack(packPath);
    const mapId = options.mapId ?? this.worldPack?.manifest.entryZone ?? 'central-park';

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
    this.setMetadata({ roomId });
    registerRoom(roomId, this.roomId);
    this.facilityService = new FacilityService(this.state);
    registerAllFacilityHandlers(this.facilityService);
    this.loadFacilitiesFromWorldPack();
    this.loadNpcsFromWorldPack();
    this.permissionService = new PermissionService(this.state);
    this.skillService = new SkillService(this.state);
    this.registerBuiltinSkills();
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

    this.onMessage(
      'skill_invoke',
      (
        client,
        data: {
          skillId: string;
          actionId: string;
          targetId?: string;
          params?: Record<string, unknown>;
        }
      ) => {
        const entityId = this.clientEntities.get(client.sessionId);
        if (!entityId || !this.skillService) return;

        const entity = this.state.getEntity(entityId);
        if (!entity) return;

        const txId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        void this.skillService
          .invokeAction(
            entityId,
            data.skillId,
            data.actionId,
            {
              targetId: data.targetId,
              ...data.params,
            },
            txId
          )
          .then(outcome => {
            client.send('skill.invoke_result', { txId, outcome });
            if (outcome.type === 'pending') {
              this.broadcast('skill.cast_started', {
                txId,
                skillId: data.skillId,
                actionId: data.actionId,
                casterId: entityId,
                targetId: data.targetId,
                completionTime: (outcome.data as { completionTime?: number })?.completionTime,
              });
            }
          });
      }
    );

    this.onMessage('skill_cancel', client => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId || !this.skillService) return;

      const cancelled = this.skillService.cancelAllCastsForAgent(entityId);
      if (cancelled > 0) {
        this.broadcast('skill.cast_cancelled', { casterId: entityId, reason: 'user_cancelled' });
      }
    });

    this.onMessage(
      'interact',
      (
        client,
        data: {
          targetId: string;
          action: string;
          params?: Record<string, unknown>;
        }
      ) => {
        const entityId = this.clientEntities.get(client.sessionId);
        if (!entityId) return;

        const entity = this.state.getEntity(entityId);
        if (!entity) return;

        const txId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const outcome = this.handleInteraction(
          entityId,
          data.targetId,
          data.action,
          data.params ?? {}
        );

        client.send('interact.result', { txId, outcome });
      }
    );

    // Set up periodic cleanup of expired events (every minute)
    this.cleanupInterval = setInterval(() => {
      const removed = this.eventLog.cleanup();
      if (removed > 0) {
        console.log(`[GameRoom] Cleaned up ${removed} expired events`);
      }
    }, 60000);

    this.staleAgentCleanupInterval = setInterval(() => {
      this.cleanupStaleAgents();
    }, AGENT_CLEANUP_INTERVAL_MS);

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

  getSkillService(): SkillService | null {
    return this.skillService;
  }

  getOccupancy(): number {
    return this.state.humans.size + this.state.agents.size;
  }

  handleInteraction(
    agentId: string,
    targetId: string,
    action: string,
    params: Record<string, unknown>
  ): InteractOutcome {
    const agentEntity = this.state.getEntity(agentId);
    if (!agentEntity) {
      return { type: 'invalid_action', message: 'Agent not found' };
    }

    const targetFacility = this.facilityService.getFacility(targetId);

    if (targetFacility) {
      const distance = this.calculateDistance(
        agentEntity.pos.x,
        agentEntity.pos.y,
        targetFacility.position.x,
        targetFacility.position.y
      );

      if (distance > DEFAULT_PROXIMITY_RADIUS) {
        return {
          type: 'too_far',
          message: `Facility '${targetId}' is too far away`,
        };
      }

      const outcome = this.facilityService.interact(targetId, agentId, action, params);

      if (outcome.type === 'ok') {
        this.eventLog.append('facility.interacted', this.state.roomId, {
          facilityId: targetId,
          facilityType: targetFacility.type,
          action,
          entityId: agentId,
        });
      }

      return outcome;
    }

    const targetNpc = this.state.npcs.get(targetId);
    if (targetNpc && this.npcSystem) {
      const distance = this.calculateDistance(
        agentEntity.pos.x,
        agentEntity.pos.y,
        targetNpc.x,
        targetNpc.y
      );

      if (distance > DEFAULT_PROXIMITY_RADIUS) {
        return { type: 'too_far', message: `NPC '${targetNpc.name}' is too far away` };
      }

      return this.handleNpcInteraction(agentId, targetNpc.id, action, params);
    }

    const targetEntity = this.state.getEntity(targetId);

    if (!targetEntity) {
      return { type: 'invalid_action', message: `Target '${targetId}' not found` };
    }

    if (targetEntity.kind !== 'object') {
      return {
        type: 'invalid_action',
        message: `Target '${targetId}' is not an interactable object`,
      };
    }

    const distance = this.calculateDistance(
      agentEntity.pos.x,
      agentEntity.pos.y,
      targetEntity.pos.x,
      targetEntity.pos.y
    );

    if (distance > DEFAULT_PROXIMITY_RADIUS) {
      return { type: 'too_far', message: `Target '${targetId}' is too far away` };
    }

    const objectType = targetEntity.meta.get('objectType') || 'unknown';
    const outcome = this.handleObjectInteraction(
      objectType,
      action,
      agentEntity,
      targetEntity,
      params
    );

    if (outcome.type === 'ok' && ['open', 'close', 'use', 'read'].includes(action)) {
      this.eventLog.append('object.state_changed', this.state.roomId, {
        objectId: targetId,
        objectType,
        action,
        agentId,
      });
    }

    return outcome;
  }

  private handleNpcInteraction(
    agentId: string,
    npcId: string,
    action: string,
    params: Record<string, unknown>
  ): InteractOutcome {
    if (!this.npcSystem) {
      return { type: 'invalid_action', message: 'NPC system not initialized' };
    }

    const npc = this.state.npcs.get(npcId);
    const npcDef = this.npcSystem.getDefinition(npcId);

    if (!npc || !npcDef) {
      return { type: 'invalid_action', message: `NPC '${npcId}' not found` };
    }

    if (action === 'talk') {
      return this.handleNpcTalk(agentId, npc.id, npc.name, npcDef.dialogue, params);
    }

    return { type: 'invalid_action', message: `Unknown action '${action}' for NPC` };
  }

  private handleNpcTalk(
    agentId: string,
    npcId: string,
    npcName: string,
    dialogue: DialogueTree | string[] | undefined,
    params: Record<string, unknown>
  ): InteractOutcome {
    if (!dialogue) {
      return { type: 'ok', message: `${npcName}: "Hello there!"` };
    }

    if (Array.isArray(dialogue)) {
      const randomIndex = Math.floor(Math.random() * dialogue.length);
      return { type: 'ok', message: `${npcName}: "${dialogue[randomIndex]}"` };
    }

    const dialogueState = this.dialogueStates.get(agentId);
    const optionIndex = typeof params.option === 'number' ? params.option : undefined;

    if (optionIndex !== undefined && dialogueState && dialogueState.npcId === npcId) {
      const currentNode = dialogue[dialogueState.currentNodeId];
      if (currentNode && currentNode.options[optionIndex]) {
        const selectedOption = currentNode.options[optionIndex];
        const nextNodeId = selectedOption.next;

        if (nextNodeId === null) {
          this.dialogueStates.delete(agentId);
          return {
            type: 'ok',
            message: JSON.stringify({
              npcName,
              npcId,
              action: 'end',
              selectedOption: selectedOption.text,
            }),
          };
        }

        const nextNode = dialogue[nextNodeId];
        if (nextNode) {
          this.dialogueStates.set(agentId, { npcId, currentNodeId: nextNodeId });
          return {
            type: 'ok',
            message: JSON.stringify({
              npcName,
              npcId,
              nodeId: nextNodeId,
              text: nextNode.text,
              options: nextNode.options.map((opt, idx) => ({ index: idx, text: opt.text })),
            }),
          };
        }
      }
    }

    const greetingNode = dialogue['greeting'];
    if (!greetingNode) {
      const firstKey = Object.keys(dialogue)[0];
      const firstNode = firstKey ? dialogue[firstKey] : undefined;
      if (firstNode) {
        this.dialogueStates.set(agentId, { npcId, currentNodeId: firstKey });
        return {
          type: 'ok',
          message: JSON.stringify({
            npcName,
            npcId,
            nodeId: firstKey,
            text: firstNode.text,
            options: firstNode.options.map((opt, idx) => ({ index: idx, text: opt.text })),
          }),
        };
      }
      return { type: 'ok', message: `${npcName}: "..."` };
    }

    this.dialogueStates.set(agentId, { npcId, currentNodeId: 'greeting' });
    return {
      type: 'ok',
      message: JSON.stringify({
        npcName,
        npcId,
        nodeId: 'greeting',
        text: greetingNode.text,
        options: greetingNode.options.map((opt, idx) => ({ index: idx, text: opt.text })),
      }),
    };
  }

  private handleObjectInteraction(
    objectType: string,
    action: string,
    agent: EntitySchema,
    target: EntitySchema,
    _params: Record<string, unknown>
  ): InteractOutcome {
    switch (objectType) {
      case 'sign':
        if (action === 'read') {
          const text = target.meta.get('text') || 'Empty sign';
          return { type: 'ok', message: text };
        }
        break;

      case 'door':
        if (action === 'open') {
          const isOpen = target.meta.get('isOpen');
          if (isOpen === 'true') {
            return { type: 'no_effect', message: 'Door is already open' };
          }
          target.meta.set('isOpen', 'true');
          return { type: 'ok', message: 'Door opened' };
        }
        if (action === 'close') {
          const isOpen = target.meta.get('isOpen');
          if (isOpen !== 'true') {
            return { type: 'no_effect', message: 'Door is already closed' };
          }
          target.meta.set('isOpen', 'false');
          return { type: 'ok', message: 'Door closed' };
        }
        break;

      case 'chest':
        if (action === 'open') {
          const isOpen = target.meta.get('isOpen');
          if (isOpen === 'true') {
            return { type: 'no_effect', message: 'Chest is already open' };
          }
          const loot = target.meta.get('loot') || 'nothing';
          target.meta.set('isOpen', 'true');
          return { type: 'ok', message: `You found: ${loot}!` };
        }
        break;

      case 'portal':
        if (action === 'use') {
          const destXRaw = target.meta.get('destX');
          const destYRaw = target.meta.get('destY');
          if (destXRaw === undefined || destYRaw === undefined) {
            return { type: 'invalid_action', message: 'Portal destination is not configured' };
          }

          const destX = parseInt(destXRaw, 10);
          const destY = parseInt(destYRaw, 10);
          if (Number.isNaN(destX) || Number.isNaN(destY)) {
            return { type: 'invalid_action', message: 'Portal destination is invalid' };
          }

          if (!this.collisionSystem) {
            return { type: 'invalid_action', message: 'Collision system is not initialized' };
          }

          if (!this.collisionSystem.isInBounds(destX, destY)) {
            return { type: 'invalid_action', message: 'Portal destination is out of bounds' };
          }

          if (this.collisionSystem.isBlocked(destX, destY)) {
            return { type: 'invalid_action', message: 'Portal destination is blocked' };
          }

          const worldPos = this.collisionSystem.tileToWorld(destX, destY);
          agent.setTile(destX, destY);
          agent.setPosition(worldPos.x, worldPos.y);
          return { type: 'ok', message: 'Teleported' };
        }
        break;
    }

    return { type: 'invalid_action', message: `No handler for ${action} on ${objectType}` };
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  getRecentProximityEvents(): ProximityEvent[] {
    return this.recentProximityEvents;
  }

  clearRecentProximityEvents(): void {
    this.recentProximityEvents = [];
  }

  override onJoin(client: Client, options: { name?: string }): void {
    if (this.getOccupancy() >= MAX_CHANNEL_OCCUPANCY) {
      throw new Error('Channel is full');
    }

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

      if (this.skillService) {
        this.skillService.cleanupAgent(entityId);
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
    unregisterRoom(this.state.roomId);
    console.log(`[GameRoom] Disposing room ${this.state.roomId}`);
    this.clientEntities.clear();
    this.recentProximityEvents = [];

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.staleAgentCleanupInterval) {
      clearInterval(this.staleAgentCleanupInterval);
      this.staleAgentCleanupInterval = null;
    }
  }

  private cleanupStaleAgents(): void {
    const staleAgents: { id: string; name: string }[] = [];

    this.state.agents.forEach((entity, agentId) => {
      if (entity.kind === 'agent' && entity.isStale(AGENT_TIMEOUT_MS)) {
        staleAgents.push({ id: agentId, name: entity.name });
      }
    });

    for (const { id, name } of staleAgents) {
      if (this.zoneSystem) {
        this.zoneSystem.removeEntity(id, this.eventLog, this.state.roomId);
      }

      if (this.skillService) {
        this.skillService.cleanupAgent(id);
      }

      this.state.removeEntity(id, 'agent');

      this.eventLog.append('presence.leave', this.state.roomId, {
        entityId: id,
        name,
        kind: 'agent',
        reason: 'timeout',
      });

      console.log(
        `[GameRoom] Removed stale agent: ${id} (${name}) - inactive for ${AGENT_TIMEOUT_MS}ms`
      );
    }

    if (staleAgents.length > 0) {
      console.log(`[GameRoom] Cleaned up ${staleAgents.length} stale agents`);
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

    if (this.skillService) {
      this.skillService.processPendingCasts();
      this.skillService.processEffectExpirations();
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

  getSpawnPoint(): { x: number; y: number; tx: number; ty: number } {
    return { ...this.spawnPoint };
  }

  private registerBuiltinSkills(): void {
    if (!this.skillService) return;

    const slowAuraSkill: SkillDefinition = {
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

    this.skillService.registerSkill(slowAuraSkill);
    console.log('[GameRoom] Registered builtin skill: slow_aura');

    const defaultSkill: SkillDefinition = {
      id: 'default',
      name: 'Basic Agent Skill',
      version: '1.0.0',
      description: 'A basic skill for all agents',
      category: 'utility',
      emoji: '🤖',
      source: { type: 'builtin' },
      actions: [
        {
          id: 'use',
          name: 'Use',
          description: 'Perform a basic action',
          params: [],
          cooldownMs: 1000,
        },
      ],
      triggers: ['basic', 'utility'],
    };

    this.skillService.registerSkill(defaultSkill);
    console.log('[GameRoom] Registered builtin skill: default');
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

  private loadNpcsFromWorldPack(): void {
    if (!this.worldPack) {
      return;
    }

    let loadedCount = 0;
    for (const npcDef of this.worldPack.npcs) {
      const npc = new NPCSchema(`npc_${npcDef.id}`, npcDef.id, npcDef.name, npcDef.role);
      npc.setZone(npcDef.zone);
      const pos = npcDef.spawnPosition ?? npcDef.defaultPosition ?? { x: 0, y: 0 };
      npc.setPosition(pos.x, pos.y);
      this.state.addNPC(npc);

      if (this.npcSystem) {
        this.npcSystem.registerNPC(npc, npcDef);
      }

      loadedCount++;
    }

    console.log(`[GameRoom] Registered ${loadedCount} NPCs from world pack`);
  }
}
