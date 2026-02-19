import { matchMaker } from 'colyseus';
import type { GameRoom } from '../rooms/GameRoom.js';
import { getAllRoomEntries, getColyseusRoomId, registerRoom } from './roomRegistry.js';
import { MAX_CHANNEL_OCCUPANCY, CHANNEL_PREFIX } from '../constants.js';

export interface ChannelInfo {
  channelId: string;
  occupancy: number;
  maxOccupancy: number;
}

/**
 * Mutex lock for channel creation to prevent TOCTOU race (#411).
 * Serialises assignChannel() calls so two concurrent requests
 * cannot read the same channel count and create duplicate IDs.
 */
let channelCreationLock: Promise<void> = Promise.resolve();

function getOccupancyForRoom(colyseusRoomId: string): number {
  const room = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;
  if (!room) return 0;
  return room.state.humans.size + room.state.agents.size;
}

export function getChannelList(): ChannelInfo[] {
  const channels: ChannelInfo[] = [];
  for (const [customId, colyseusId] of getAllRoomEntries()) {
    if (!customId.startsWith(`${CHANNEL_PREFIX}-`)) continue;
    channels.push({
      channelId: customId,
      occupancy: getOccupancyForRoom(colyseusId),
      maxOccupancy: MAX_CHANNEL_OCCUPANCY,
    });
  }
  return channels;
}

export function canJoinChannel(channelId: string): boolean {
  const colyseusRoomId = getColyseusRoomId(channelId);
  if (!colyseusRoomId) return true; // room not created yet — can be created
  return getOccupancyForRoom(colyseusRoomId) < MAX_CHANNEL_OCCUPANCY;
}

export async function assignChannel(): Promise<{ channelId: string; colyseusRoomId: string }> {
  // Acquire the creation lock to prevent TOCTOU race (#411)
  let releaseLock!: () => void;
  const prevLock = channelCreationLock;
  channelCreationLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await prevLock;

  try {
    // Find existing channels with available capacity, pick the least-occupied one
    const channels = getChannelList();
    const available = channels
      .filter((ch) => ch.occupancy < ch.maxOccupancy)
      .sort((a, b) => a.occupancy - b.occupancy);

    if (available.length > 0) {
      const best = available[0];
      const colyseusRoomId = getColyseusRoomId(best.channelId);
      if (colyseusRoomId) {
        return { channelId: best.channelId, colyseusRoomId };
      }
    }

    // All channels full (or none exist) — create a new one
    const nextNum = channels.length + 1;
    const newChannelId = `${CHANNEL_PREFIX}-${nextNum}`;
    const roomRef = await matchMaker.createRoom('game', { roomId: newChannelId });
    registerRoom(newChannelId, roomRef.roomId);
    console.log(`[ChannelManager] Created new channel ${newChannelId} (room ${roomRef.roomId})`);
    return { channelId: newChannelId, colyseusRoomId: roomRef.roomId };
  } finally {
    releaseLock();
  }
}
