import { matchMaker } from 'colyseus';
import { listRooms, getColyseusRoomId } from './roomRegistry.js';
import { MAX_CHANNEL_OCCUPANCY, CHANNEL_PREFIX } from '../constants.js';
import type { GameRoom } from '../rooms/GameRoom.js';

export interface ChannelInfo {
  channelId: string;
  currentAgents: number;
  maxAgents: number;
  status: 'open' | 'full';
}

export function getChannelList(): ChannelInfo[] {
  const rooms = listRooms();
  return rooms
    .filter(r => r.customRoomId.startsWith(CHANNEL_PREFIX))
    .map(r => {
      const gameRoom = matchMaker.getLocalRoomById(r.colyseusRoomId) as GameRoom | undefined;
      const currentAgents = gameRoom?.getOccupancy() ?? 0;
      return {
        channelId: r.customRoomId,
        currentAgents,
        maxAgents: MAX_CHANNEL_OCCUPANCY,
        status: currentAgents >= MAX_CHANNEL_OCCUPANCY ? 'full' : 'open',
      };
    });
}

/**
 * Mutex for channel creation to prevent TOCTOU race conditions.
 * Multiple concurrent requests checking "all channels full" simultaneously
 * would otherwise all try to create the same new channel ID.
 */
let channelCreationLock: Promise<void> = Promise.resolve();

export async function assignChannel(): Promise<{ channelId: string; colyseusRoomId: string }> {
  // Serialize channel creation through a promise-chain mutex so only one
  // request at a time can check occupancy and potentially create a new channel.
  let releaseLock!: () => void;
  const previousLock = channelCreationLock;
  channelCreationLock = new Promise<void>(resolve => {
    releaseLock = resolve;
  });

  await previousLock;
  try {
    const channels = getChannelList();
    const available = channels
      .filter(c => c.currentAgents < c.maxAgents)
      .sort((a, b) => a.currentAgents - b.currentAgents);

    if (available.length > 0) {
      const ch = available[0];
      return { channelId: ch.channelId, colyseusRoomId: getColyseusRoomId(ch.channelId)! };
    }

    // All channels full — create next one
    const nextNum = channels.length + 1;
    const newChannelId = `${CHANNEL_PREFIX}-${nextNum}`;
    const roomRef = await matchMaker.createRoom('game', { roomId: newChannelId });
    return { channelId: newChannelId, colyseusRoomId: roomRef.roomId };
  } finally {
    releaseLock();
  }
}

export function canJoinChannel(channelId: string): boolean {
  const colyseusRoomId = getColyseusRoomId(channelId);
  if (!colyseusRoomId) return true;
  const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;
  if (!gameRoom) return true;
  return gameRoom.getOccupancy() < MAX_CHANNEL_OCCUPANCY; // canJoinChannel uses raw occupancy, not ChannelInfo
}
