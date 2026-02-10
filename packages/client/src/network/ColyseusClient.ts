import * as Colyseus from 'colyseus.js';
import type { EntityKind, Facing } from '@openclawworld/shared';

export interface Vector2 {
  x: number;
  y: number;
}

export interface TileCoord {
  tx: number;
  ty: number;
}

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  roomId: string;
  pos: Vector2;
  tile?: TileCoord;
  facing: Facing;
  speed: number;
  meta: Map<string, string>;
}

export interface GameMap {
  mapId: string;
  width: number;
  height: number;
  tileSize: number;
}

export interface SchemaMap<T> {
  onAdd(callback: (item: T, key: string) => void): void;
  onRemove(callback: (item: T, key: string) => void): void;
  onChange(callback: (item: T, key: string) => void): void;
  forEach(
    callbackfn: (value: T, key: string, map: Map<string, T>) => void,
    thisArg?: unknown
  ): void;
  get(key: string): T | undefined;
}

export interface RoomState {
  roomId: string;
  mapId: string;
  tickRate: number;
  map: GameMap;
  humans: SchemaMap<Entity>;
  agents: SchemaMap<Entity>;
  objects: SchemaMap<Entity>;
}

export class ColyseusClient {
  private client: Colyseus.Client;
  private room: Colyseus.Room<RoomState> | null = null;
  private _sessionId: string | null = null;

  constructor(endpoint: string = 'ws://localhost:2567') {
    this.client = new Colyseus.Client(endpoint);
  }

  async connect(name: string): Promise<Colyseus.Room<RoomState>> {
    try {
      this.room = await this.client.joinOrCreate<RoomState>('game_room', { name });
      this._sessionId = this.room.sessionId;
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

  get sessionId() {
    return this._sessionId;
  }

  get currentRoom() {
    return this.room;
  }
}

export const gameClient = new ColyseusClient();
