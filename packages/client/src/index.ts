import type { EntityBase } from '@openclawworld/shared';

export const CLIENT_VERSION = '0.1.0';

export interface GameClient {
  connect(roomId: string): Promise<void>;
  disconnect(): void;
  getLocalPlayer(): EntityBase | null;
}

export function createClient(): GameClient {
  console.log(`OpenClawWorld Client v${CLIENT_VERSION} - Placeholder`);
  console.log('Client implementation pending (Phase 3)');

  return {
    connect: async (_roomId: string): Promise<void> => {
      console.log('Connecting to room:', _roomId);
    },
    disconnect: (): void => {
      console.log('Disconnected');
    },
    getLocalPlayer: (): null => null,
  };
}
