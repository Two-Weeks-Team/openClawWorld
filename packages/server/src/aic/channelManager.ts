import { matchMaker } from 'colyseus';
import { listRooms, getColyseusRoomId } from './roomRegistry.js';
import { MAX_CHANNEL_OCCUPANCY, CHANNEL_PREFIX } from '../constants.js';
import type { ChannelInfo } from '@openclawworld/shared';
import type { GameRoom } from '../rooms/GameRoom.js';

export type { ChannelInfo };

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
      } as ChannelInfo;
    });
}

/**
 * Returns the channel list for the lobby UI, falling back to a single
 * bootstrap channel when no rooms have been registered yet.
 *
 * The bootstrap entry (`channel-1`) is informational — the client uses it to
 * display a non-empty selector.  Actual room creation happens later via
 * `assignChannel()` during `/register`.
 */
export function getChannelListOrDefault(): ChannelInfo[] {
  const channels = getChannelList();
  if (channels.length > 0) return channels;
  // Return a single bootstrap entry so the lobby UI is never empty.
  // The channelId matches the first channel assignChannel() would create.
  return [
    {
      channelId: `${CHANNEL_PREFIX}-1`,
      currentAgents: 0,
      maxAgents: MAX_CHANNEL_OCCUPANCY,
      status: 'open' as const,
    },
  ];
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
    const roomRef = await matchMaker.createRoom('game', { channelId: newChannelId });
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
  return gameRoom.getOccupancy() < MAX_CHANNEL_OCCUPANCY;
}
