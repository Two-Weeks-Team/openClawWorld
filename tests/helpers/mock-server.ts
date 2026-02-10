import type { AicResult, AicErrorCode } from '@openclawworld/shared';

export function createOkResult<T>(data: T): AicResult<T> {
  return { status: 'ok', data };
}

export function createErrorResult(
  code: AicErrorCode,
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): AicResult<never> {
  return {
    status: 'error',
    error: { code, message, retryable, details },
  };
}

export type MockHandler = (url: string, body: unknown) => Promise<Response> | Response;

export interface MockServer {
  setHandler: (endpoint: string, handler: MockHandler) => void;
  setDefaultHandler: (handler: MockHandler) => void;
  reset: () => void;
}

let mockHandlers = new Map<string, MockHandler>();
let defaultHandler: MockHandler | null = null;

export function setupMockFetch(): MockServer {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;

    for (const [endpoint, handler] of mockHandlers) {
      if (url.includes(endpoint)) {
        const result = await handler(url, body);
        return result;
      }
    }

    if (defaultHandler) {
      return defaultHandler(url, body);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return {
    setHandler: (endpoint: string, handler: MockHandler) => {
      mockHandlers.set(endpoint, handler);
    },
    setDefaultHandler: (handler: MockHandler) => {
      defaultHandler = handler;
    },
    reset: () => {
      mockHandlers.clear();
      defaultHandler = null;
      globalThis.fetch = originalFetch;
    },
  };
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: AicErrorCode, message: string, retryable: boolean): Response {
  return jsonResponse(createErrorResult(code, message, retryable), 400);
}

export function unauthorizedResponse(): Response {
  return jsonResponse(createErrorResult('unauthorized', 'Invalid or missing API key', false), 401);
}

export function rateLimitedResponse(): Response {
  return jsonResponse(
    createErrorResult('rate_limited', 'Rate limit exceeded. Please try again later.', true),
    429
  );
}

export function notFoundResponse(resource: string): Response {
  return jsonResponse(createErrorResult('not_found', `${resource} not found`, false), 404);
}

export const TestData = {
  agent: {
    id: 'agt_test_agent',
    kind: 'agent' as const,
    name: 'Test Agent',
    roomId: 'test_room',
    pos: { x: 100, y: 100 },
    tile: { tx: 10, ty: 10 },
    facing: 'down' as const,
  },
  human: {
    id: 'hum_test_human',
    kind: 'human' as const,
    name: 'Test Human',
    roomId: 'test_room',
    pos: { x: 120, y: 100 },
    tile: { tx: 12, ty: 10 },
  },
  object: {
    id: 'obj_test_sign',
    kind: 'object' as const,
    name: 'Test Sign',
    roomId: 'test_room',
    pos: { x: 110, y: 90 },
    tile: { tx: 11, ty: 9 },
  },
  room: {
    roomId: 'test_room',
    mapId: 'test_map',
    tickRate: 20,
  },
  txId: () => `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  cursor: (n: number) => `c_${n}`,
  timestamp: () => Date.now(),
} as const;

export function expectOkResult<T>(
  result: AicResult<T>
): asserts result is { status: 'ok'; data: T } {
  if (result.status !== 'ok') {
    throw new Error(
      `Expected ok result but got error: ${result.error?.code} - ${result.error?.message}`
    );
  }
}

export function expectErrorResult(
  result: AicResult<unknown>,
  expectedCode?: AicErrorCode
): asserts result is {
  status: 'error';
  error: { code: AicErrorCode; message: string; retryable: boolean };
} {
  if (result.status !== 'error') {
    throw new Error(`Expected error result but got ok: ${JSON.stringify(result.data)}`);
  }
  if (expectedCode && result.error.code !== expectedCode) {
    throw new Error(`Expected error code ${expectedCode} but got ${result.error.code}`);
  }
}
