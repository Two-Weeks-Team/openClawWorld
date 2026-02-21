// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.14
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { GameMap } from './GameMap'
import { EntitySchema } from './EntitySchema'
import { ZoneSchema } from './ZoneSchema'
import { OrganizationSchema } from './OrganizationSchema'
import { TeamSchema } from './TeamSchema'
import { NPCSchema } from './NPCSchema'
import { NoticeSchema } from './NoticeSchema'
import { FacilitySchema } from './FacilitySchema'
import { MeetingReservationSchema } from './MeetingReservationSchema'
import { KanbanBoardSchema } from './KanbanBoardSchema'
import { WhiteboardSchema } from './WhiteboardSchema'
import { VoteSchema } from './VoteSchema'

export class RoomState extends Schema {
    @type("string") public roomId!: string;
    @type("string") public mapId!: string;
    @type("number") public tickRate!: number;
    @type(GameMap) public map: GameMap = new GameMap();
    @type({ map: EntitySchema }) public humans: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();
    @type({ map: EntitySchema }) public agents: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();
    @type({ map: EntitySchema }) public objects: MapSchema<EntitySchema> = new MapSchema<EntitySchema>();
    @type({ map: ZoneSchema }) public zones: MapSchema<ZoneSchema> = new MapSchema<ZoneSchema>();
    @type({ map: OrganizationSchema }) public organizations: MapSchema<OrganizationSchema> = new MapSchema<OrganizationSchema>();
    @type({ map: TeamSchema }) public teams: MapSchema<TeamSchema> = new MapSchema<TeamSchema>();
    @type({ map: NPCSchema }) public npcs: MapSchema<NPCSchema> = new MapSchema<NPCSchema>();
    @type({ map: NoticeSchema }) public notices: MapSchema<NoticeSchema> = new MapSchema<NoticeSchema>();
    @type({ map: FacilitySchema }) public facilities: MapSchema<FacilitySchema> = new MapSchema<FacilitySchema>();
    @type({ map: MeetingReservationSchema }) public reservations: MapSchema<MeetingReservationSchema> = new MapSchema<MeetingReservationSchema>();
    @type({ map: KanbanBoardSchema }) public boards: MapSchema<KanbanBoardSchema> = new MapSchema<KanbanBoardSchema>();
    @type({ map: WhiteboardSchema }) public whiteboards: MapSchema<WhiteboardSchema> = new MapSchema<WhiteboardSchema>();
    @type({ map: VoteSchema }) public votes: MapSchema<VoteSchema> = new MapSchema<VoteSchema>();
}
