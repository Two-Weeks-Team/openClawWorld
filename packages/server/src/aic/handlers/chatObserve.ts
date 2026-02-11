import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  ChatObserveRequest,
  ChatObserveResponseData,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
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

export async function handleChatObserve(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ChatObserveRequest;
  const { agentId, roomId, windowSec, channel } = body;

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

    const chatSystem = gameRoom.getChatSystem();

    if (!chatSystem) {
      res
        .status(503)
        .json(
          createErrorResponse('room_not_ready', `Room '${roomId}' chat system not ready`, true)
        );
      return;
    }

    const messages = chatSystem.getMessages(roomId, channel, windowSec);

    const responseData: ChatObserveResponseData = {
      messages,
      serverTsMs: Date.now(),
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[ChatObserveHandler] Error processing chatObserve request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse(
          'internal',
          'Internal server error processing chatObserve request',
          true
        )
      );
  }
}
