import type { Request, Response } from 'express';
import { getChannelList } from '../channelManager.js';
import { CHANNEL_PREFIX, MAX_CHANNEL_OCCUPANCY } from '../../constants.js';

export function handleChannels(_req: Request, res: Response): void {
  const channels = getChannelList();
  const channelsForLobby =
    channels.length > 0
      ? channels
      : [
          {
            channelId: `${CHANNEL_PREFIX}-1`,
            occupancy: 0,
            maxOccupancy: MAX_CHANNEL_OCCUPANCY,
          },
        ];
  res.json({ status: 'ok', data: { channels: channelsForLobby } });
}
