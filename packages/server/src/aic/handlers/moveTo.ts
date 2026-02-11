import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { MoveToRequest, MoveToResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { moveToIdempotencyStore } from '../idempotency.js';
import { getColyseusRoomId } from '../roomRegistry.js';

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

export async function handleMoveTo(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as MoveToRequest;
  const { agentId, roomId, txId, dest } = body;

  try {
    const idempotencyCheck = moveToIdempotencyStore.check(agentId, roomId, txId, body);

    if (idempotencyCheck.status === 'conflict') {
      res.status(409).json(createErrorResponse('conflict', idempotencyCheck.error.message, false));
      return;
    }

    if (idempotencyCheck.status === 'replay') {
      res.status(200).json({
        status: 'ok',
        data: idempotencyCheck.result,
      });
      return;
    }

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

    const collisionSystem = gameRoom.getCollisionSystem();

    if (!collisionSystem) {
      res
        .status(503)
        .json(
          createErrorResponse('room_not_ready', `Room '${roomId}' collision system not ready`, true)
        );
      return;
    }

    const { tx, ty } = dest;

    if (!collisionSystem.isInBounds(tx, ty)) {
      const responseData: MoveToResponseData = {
        txId,
        applied: false,
        serverTsMs: Date.now(),
        result: 'rejected',
      };
      moveToIdempotencyStore.save(agentId, roomId, txId, body, responseData);
      res.status(200).json({
        status: 'ok',
        data: responseData,
      });
      return;
    }

    if (collisionSystem.isBlocked(tx, ty)) {
      const responseData: MoveToResponseData = {
        txId,
        applied: false,
        serverTsMs: Date.now(),
        result: 'rejected',
      };
      moveToIdempotencyStore.save(agentId, roomId, txId, body, responseData);
      res.status(200).json({
        status: 'ok',
        data: responseData,
      });
      return;
    }

    const movementSystem = gameRoom.getMovementSystem();

    if (!movementSystem) {
      res
        .status(503)
        .json(
          createErrorResponse('room_not_ready', `Room '${roomId}' movement system not ready`, true)
        );
      return;
    }

    const result = movementSystem.setDestination(agentId, tx, ty);

    const responseData: MoveToResponseData = {
      txId,
      applied: result === 'accepted',
      serverTsMs: Date.now(),
      result,
    };

    moveToIdempotencyStore.save(agentId, roomId, txId, body, responseData);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[MoveToHandler] Error processing moveTo request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing moveTo request', true)
      );
  }
}
