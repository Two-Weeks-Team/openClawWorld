import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { ChatSendRequest, ChatSendResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { chatSendIdempotencyStore } from '../idempotency.js';
import { getColyseusRoomId } from '../roomRegistry.js';

const MAX_MESSAGE_LENGTH = 500;
const VALID_CHANNELS = ['proximity', 'global'] as const;
const PROXIMITY_CHAT_RADIUS = 160; // 10 tiles * 16px per tile

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

  if (req.authAgentId !== agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Agent ID mismatch with auth token', false));
    return;
  }

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
      res
        .status(400)
        .json(
          createErrorResponse(
            'bad_request',
            `Channel '${channel}' is not supported. Supported channels: ${VALID_CHANNELS.join(', ')}`,
            false
          )
        );
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      const responseData: ChatSendResponseData = {
        txId,
        applied: false,
        serverTsMs: Date.now(),
      };
      chatSendIdempotencyStore.save(agentId, roomId, txId, body, responseData);
      res.status(200).json({
        status: 'ok',
        data: responseData,
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

    const chatSystem = gameRoom.getChatSystem();

    if (!chatSystem) {
      res
        .status(503)
        .json(
          createErrorResponse('room_not_ready', `Room '${roomId}' chat system not ready`, true)
        );
      return;
    }

    const result = chatSystem.sendMessage(roomId, channel, agentId, agentEntity.name, message);

    if (!result) {
      res
        .status(403)
        .json(
          createErrorResponse('forbidden', 'Not authorized to send message in this channel', false)
        );
      return;
    }

    const { messageId, tsMs } = result;

    // Broadcast to WebSocket clients so human players see AI agent messages in real-time
    if (channel === 'proximity') {
      const senderPos = agentEntity.pos;

      gameRoom.clients.forEach(client => {
        const clientEntity = gameRoom.state.getEntity(client.sessionId);
        if (!clientEntity) return;

        const dx = clientEntity.pos.x - senderPos.x;
        const dy = clientEntity.pos.y - senderPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= PROXIMITY_CHAT_RADIUS) {
          client.send('chat', {
            from: agentEntity.name,
            message,
            entityId: agentId,
            channel,
            messageId,
            tsMs,
          });
        }
      });
    } else {
      gameRoom.broadcast('chat', {
        from: agentEntity.name,
        message,
        entityId: agentId,
        channel,
        messageId,
        tsMs,
      });
    }

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
