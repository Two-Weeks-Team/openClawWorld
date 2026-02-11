import { Schema, type, MapSchema } from '@colyseus/schema';
import type {
  EntityKind,
  Facing,
  TileCoord,
  Vec2,
  UserStatus,
  ZoneId,
} from '@openclawworld/shared';

export class Vector2Schema extends Schema {
  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;

  constructor(x?: number, y?: number) {
    super();
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
  }

  toVec2(): Vec2 {
    return { x: this.x, y: this.y };
  }

  static fromVec2(vec: Vec2): Vector2Schema {
    return new Vector2Schema(vec.x, vec.y);
  }
}

export class TileCoordSchema extends Schema {
  @type('number')
  tx: number = 0;

  @type('number')
  ty: number = 0;

  constructor(tx?: number, ty?: number) {
    super();
    if (tx !== undefined) this.tx = tx;
    if (ty !== undefined) this.ty = ty;
  }

  toTileCoord(): TileCoord {
    return { tx: this.tx, ty: this.ty };
  }

  static fromTileCoord(coord: TileCoord): TileCoordSchema {
    return new TileCoordSchema(coord.tx, coord.ty);
  }
}

export class EntitySchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  kind: EntityKind = 'human';

  @type('string')
  name: string = '';

  @type('string')
  status: UserStatus = 'online';

  @type('string')
  statusMessage: string = '';

  @type('string')
  title: string = '';

  @type('string')
  department: string = '';

  @type('string')
  orgId: string = '';

  @type('string')
  teamId: string = '';

  @type('string')
  roomId: string = '';

  @type(Vector2Schema)
  pos: Vector2Schema = new Vector2Schema();

  @type(TileCoordSchema)
  tile?: TileCoordSchema;

  @type('string')
  facing: Facing = 'down';

  @type('string')
  currentZone: ZoneId = 'plaza';

  @type('number')
  speed: number = 100;

  @type({ map: 'string' })
  meta: MapSchema<string> = new MapSchema<string>();

  constructor(id: string, kind: EntityKind, name: string, roomId: string) {
    super();
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.roomId = roomId;
  }

  setPosition(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
  }

  setTile(tx: number, ty: number): void {
    this.tile = new TileCoordSchema(tx, ty);
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
  }

  setZone(zone: ZoneId): void {
    this.currentZone = zone;
  }
}
