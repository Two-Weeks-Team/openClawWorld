import { Schema, type, MapSchema } from '@colyseus/schema';
import { EntitySchema } from './EntitySchema.js';
import { GameMap } from './GameMap.js';
import { NPCSchema } from './NPCSchema.js';
import { NoticeSchema } from './NoticeSchema.js';
import { OrganizationSchema } from './OrganizationSchema.js';
import { TeamSchema } from './TeamSchema.js';
import { ZoneSchema } from './ZoneSchema.js';

export class RoomState extends Schema {
  @type('string')
  roomId: string = '';

  @type('string')
  mapId: string = '';

  @type('number')
  tickRate: number = 20;

  @type(GameMap)
  map: GameMap | null = null;

  @type({ map: EntitySchema })
  humans: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();

  @type({ map: EntitySchema })
  agents: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();

  @type({ map: EntitySchema })
  objects: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();

  @type({ map: ZoneSchema })
  zones: MapSchema<ZoneSchema> = new MapSchema<ZoneSchema>();

  @type({ map: OrganizationSchema })
  organizations: MapSchema<OrganizationSchema> = new MapSchema<OrganizationSchema>();

  @type({ map: TeamSchema })
  teams: MapSchema<TeamSchema> = new MapSchema<TeamSchema>();

  @type({ map: NPCSchema })
  npcs: MapSchema<NPCSchema> = new MapSchema<NPCSchema>();

  @type({ map: NoticeSchema })
  notices: MapSchema<NoticeSchema> = new MapSchema<NoticeSchema>();

  constructor(roomId: string, mapId: string, tickRate?: number, gameMap?: GameMap) {
    super();
    this.roomId = roomId;
    this.mapId = mapId;
    if (tickRate !== undefined) {
      this.tickRate = tickRate;
    }
    if (gameMap !== undefined) {
      this.map = gameMap;
    }
  }

  addEntity(entity: EntitySchema): void {
    switch (entity.kind) {
      case 'human':
        this.humans.set(entity.id, entity);
        break;
      case 'agent':
        this.agents.set(entity.id, entity);
        break;
      case 'object':
        this.objects.set(entity.id, entity);
        break;
    }
  }

  removeEntity(entityId: string, kind: 'human' | 'agent' | 'object'): void {
    switch (kind) {
      case 'human':
        this.humans.delete(entityId);
        break;
      case 'agent':
        this.agents.delete(entityId);
        break;
      case 'object':
        this.objects.delete(entityId);
        break;
    }
  }

  getEntity(entityId: string): EntitySchema | undefined {
    return this.humans.get(entityId) ?? this.agents.get(entityId) ?? this.objects.get(entityId);
  }

  getAllEntities(): Map<string, EntitySchema> {
    const all = new Map<string, EntitySchema>();
    this.humans.forEach((entity, id) => all.set(id, entity));
    this.agents.forEach((entity, id) => all.set(id, entity));
    this.objects.forEach((entity, id) => all.set(id, entity));
    return all;
  }

  addNPC(npc: NPCSchema): void {
    this.npcs.set(npc.id, npc);
  }

  removeNPC(npcId: string): void {
    this.npcs.delete(npcId);
  }

  getNPC(npcId: string): NPCSchema | undefined {
    return this.npcs.get(npcId);
  }

  getAllNPCs(): Map<string, NPCSchema> {
    const all = new Map<string, NPCSchema>();
    this.npcs.forEach((npc, id) => all.set(id, npc));
    return all;
  }
}
