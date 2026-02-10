import type { Request, Response } from 'express';
import colyseus from 'colyseus';
import type { ChatSendRequest, ChatSendResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { chatSendIdempotencyStore } from '../idempotency.js';

const { matchMaker } = colyseus;

const MAX_MESSAGE_LENGTH = 500;
const VALID_CHANNELS = ['proximity', 'global'] as const;

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

export async function handleChatSend(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ChatSendRequest;
  const { agentId, roomId, txId, channel, message } = body;

  try {
    const idempotencyCheck = chatSendIdempotencyStore.check(agentId, roomId, txId, body);

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

    if (!VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])) {
      const responseData: ChatSendResponseData = {
        txId,
        applied: false,
        serverTsMs: Date.now(),
        chatMessageId: '',
      };
      chatSendIdempotencyStore.save(agentId, roomId, txId, body, responseData);
      res.status(200).json({
        status: 'ok',
        data: responseData,
      });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      const responseData: ChatSendResponseData = {
        txId,
        applied: false,
        serverTsMs: Date.now(),
        chatMessageId: '',
      };
      chatSendIdempotencyStore.save(agentId, roomId, txId, body, responseData);
      res.status(200).json({
        status: 'ok',
        data: responseData,
      });
      return;
    }

    const room = await matchMaker.query({ name: 'game', roomId });

    if (!room || room.length === 0) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room with id '${roomId}' not found`, false));
      return;
    }

    const roomRef = room[0];
    const gameRoom = (await matchMaker.remoteRoomCall(roomRef.roomId, '')) as GameRoom;

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

    const { messageId, tsMs } = chatSystem.sendMessage(
      roomId,
      channel,
      agentId,
      agentEntity.name,
      message
    );

    const eventLog = gameRoom.getEventLog();
    eventLog.append('chat.message', roomId, {
      messageId,
      fromEntityId: agentId,
      channel,
      message,
      tsMs,
    });

    const responseData: ChatSendResponseData = {
      txId,
      applied: true,
      serverTsMs: Date.now(),
      chatMessageId: messageId,
    };

    chatSendIdempotencyStore.save(agentId, roomId, txId, body, responseData);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[ChatSendHandler] Error processing chatSend request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing chatSend request', true)
      );
  }
}
