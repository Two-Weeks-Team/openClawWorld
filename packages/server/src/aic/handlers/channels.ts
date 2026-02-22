import type { Request, Response } from 'express';
import { getChannelListOrDefault } from '../channelManager.js';

export function handleChannels(_req: Request, res: Response): void {
  res.json({ status: 'ok', data: { channels: getChannelListOrDefault() } });
}
