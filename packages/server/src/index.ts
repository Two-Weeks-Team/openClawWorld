import type { AicResult, StatusResponseData } from '@openclawworld/shared';

export const SERVER_VERSION = '0.1.0';

export function createServer(): void {
  console.log(`OpenClawWorld Server v${SERVER_VERSION} - Placeholder`);
  console.log('Server implementation pending (Phase 1)');
}

export async function getStatus(): Promise<AicResult<StatusResponseData>> {
  return {
    status: 'ok',
    data: {
      serverReachable: true,
      baseUrl: 'http://localhost:3000',
      serverTsMs: Date.now(),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer();
}
