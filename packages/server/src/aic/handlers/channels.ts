import type { Request, Response } from 'express';
import { getChannelList } from '../channelManager.js';

export function handleChannels(_req: Request, res: Response): void {
  const channels = getChannelList();
  res.json({ status: 'ok', data: { channels } });
}
