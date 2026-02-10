import { Client, Room } from '@colyseus/sdk';

import type appConfig from '../../../server/src/app.config.js';
import type { GameRoom } from '../../../server/src/rooms/GameRoom.js';
import type { EntitySchema } from '../../../server/src/schemas/EntitySchema.js';
import type { RoomState } from '../../../server/src/schemas/RoomState.js';

export type Entity = EntitySchema;
export type GameRoomState = RoomState;
export type { RoomState, GameRoom };

export class ColyseusClient {
  private client: Client<typeof appConfig>;
  private room: Room<GameRoom> | null = null;
  private _sessionId: string | null = null;
  private _entityId: string | null = null;

  constructor(endpoint: string = 'ws://localhost:2567') {
    this.client = new Client<typeof appConfig>(endpoint);
  }

  async connect(name: string): Promise<Room<GameRoom>> {
    try {
      this.room = await this.client.joinOrCreate('game', { name });
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

  get sessionId() {
    return this._sessionId;
  }

  get entityId() {
    return this._entityId;
  }

  get currentRoom() {
    return this.room;
  }
}

export const gameClient = new ColyseusClient();
