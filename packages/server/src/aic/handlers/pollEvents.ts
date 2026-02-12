import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  PollEventsRequest,
  PollEventsResponseData,
  AicErrorObject,
  EventEnvelope,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';

/** Maximum long-polling wait time in milliseconds (25 seconds) */
const MAX_WAIT_MS = 25000;

/** Default polling interval when waiting for events (100ms) */
const POLL_INTERVAL_MS = 100;

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean
): { status: 'error'; error: AicErrorObject } {
  return {
    status: 'error',
    error: {
      code,
      message,
      retryable,
    },
  };
}

/**
 * Wait for new events with a timeout.
 * Polls the event log periodically until events are available or timeout occurs.
 *
 * @param gameRoom - The game room to poll for events
 * @param cursor - The cursor to start from
 * @param limit - Maximum number of events to return
 * @param waitMs - Maximum time to wait for new events
 * @returns Object containing events and next cursor
 */
async function waitForEvents(
  gameRoom: GameRoom,
  cursor: string,
  limit: number,
  waitMs: number
): Promise<{ events: EventEnvelope[]; nextCursor: string }> {
  const eventLog = gameRoom.getEventLog();
  const startTime = Date.now();
  const effectiveWaitMs = Math.min(waitMs, MAX_WAIT_MS);

  while (true) {
    const result = eventLog.getSince(cursor, limit);

    // If we have events, return immediately
    if (result.events.length > 0) {
      return result;
    }

    // Check if we've exceeded the wait time
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= effectiveWaitMs) {
      // Timeout - return empty result with current cursor
      return { events: [], nextCursor: cursor };
    }

    // Wait a bit before polling again
    const remainingMs = effectiveWaitMs - elapsedMs;
    const sleepMs = Math.min(POLL_INTERVAL_MS, remainingMs);
    await sleep(sleepMs);
  }
}

/**
 * Sleep for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handlePollEvents(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as PollEventsRequest;
  const { agentId, roomId, sinceCursor, limit = 50, waitMs = 0 } = body;

  try {
    const colyseusRoomId = getColyseusRoomId(roomId);

    if (!colyseusRoomId) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room with id '${roomId}' not found`, false));
      return;
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    // Verify agent exists in the room
    const agentEntity = gameRoom.state.getEntity(agentId);

    if (!agentEntity) {
      res
        .status(404)
        .json(
          createErrorResponse(
            'agent_not_in_room',
            `Agent with id '${agentId}' not found in room '${roomId}'`,
            false
          )
        );
      return;
    }

    const eventLog = gameRoom.getEventLog();

    // Use provided cursor or get current cursor from event log
    const effectiveCursor = sinceCursor ?? eventLog.getCurrentCursor();

    // If waitMs is 0 or not provided, return immediately with current events
    if (waitMs <= 0) {
      const result = eventLog.getSince(effectiveCursor, limit);

      const responseData: PollEventsResponseData = {
        events: result.events,
        nextCursor: result.nextCursor,
        serverTsMs: Date.now(),
      };

      res.status(200).json({
        status: 'ok',
        data: responseData,
      });
      return;
    }

    // Long-polling: wait for events or timeout
    const result = await waitForEvents(gameRoom, effectiveCursor, limit, waitMs);

    const responseData: PollEventsResponseData = {
      events: result.events,
      nextCursor: result.nextCursor,
      serverTsMs: Date.now(),
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[PollEventsHandler] Error processing pollEvents request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing pollEvents request', true)
      );
  }
}
