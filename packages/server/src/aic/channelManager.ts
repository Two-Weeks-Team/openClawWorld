import { matchMaker } from 'colyseus';
import { listRooms, getColyseusRoomId } from './roomRegistry.js';
import { MAX_CHANNEL_OCCUPANCY, CHANNEL_PREFIX } from '../constants.js';
import type { GameRoom } from '../rooms/GameRoom.js';

export interface ChannelInfo {
  channelId: string;
  occupancy: number;
  maxOccupancy: number;
}

export function getChannelList(): ChannelInfo[] {
  const rooms = listRooms();
  return rooms
    .filter(r => r.customRoomId.startsWith(CHANNEL_PREFIX))
    .map(r => {
      const gameRoom = matchMaker.getLocalRoomById(r.colyseusRoomId) as GameRoom | undefined;
      return {
        channelId: r.customRoomId,
        occupancy: gameRoom?.getOccupancy() ?? 0,
        maxOccupancy: MAX_CHANNEL_OCCUPANCY,
      };
    });
}

export async function assignChannel(): Promise<{ channelId: string; colyseusRoomId: string }> {
  const channels = getChannelList();
  const available = channels
    .filter(c => c.occupancy < c.maxOccupancy)
    .sort((a, b) => a.occupancy - b.occupancy);

  if (available.length > 0) {
    const ch = available[0];
    return { channelId: ch.channelId, colyseusRoomId: getColyseusRoomId(ch.channelId)! };
  }

  // All channels full — create next one
  const nextNum = channels.length + 1;
  const newChannelId = `${CHANNEL_PREFIX}-${nextNum}`;
  const roomRef = await matchMaker.createRoom('game', { roomId: newChannelId });
  return { channelId: newChannelId, colyseusRoomId: roomRef.roomId };
}

export function canJoinChannel(channelId: string): boolean {
  const colyseusRoomId = getColyseusRoomId(channelId);
  if (!colyseusRoomId) return true;
  const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;
  if (!gameRoom) return true;
  return gameRoom.getOccupancy() < MAX_CHANNEL_OCCUPANCY;
}
