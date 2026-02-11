import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { SkillInvokeRequest, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';
import { v4 as uuidv4 } from 'uuid';

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean,
  details?: Record<string, unknown>
): { status: 'error'; error: AicErrorObject } {
  return {
    status: 'error',
    error: {
      code,
      message,
      retryable,
      details,
    },
  };
}

export async function handleSkillInvoke(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as SkillInvokeRequest;
  const { agentId, roomId, skillId, actionId, params } = body;

  // TODO(security): Validate req.authToken maps to agentId (requires token registry)
  const txId = (body as { txId?: string }).txId ?? `tx_${uuidv4()}`;

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

    const skillService = gameRoom.getSkillService();

    if (!skillService) {
      res.status(503).json(createErrorResponse('room_not_ready', `Skill service not ready`, true));
      return;
    }

    const outcome = await skillService.invokeAction(agentId, skillId, actionId, params ?? {}, txId);

    switch (outcome.type) {
      case 'ok':
        res.status(200).json({
          status: 'ok',
          data: {
            txId,
            outcome: {
              type: 'ok',
              message: outcome.message,
              data: outcome.data,
            },
            serverTsMs: Date.now(),
          },
        });
        break;

      case 'pending': {
        const pendingData = outcome.data as { completionTime?: number } | undefined;
        res.status(200).json({
          status: 'ok',
          data: {
            txId,
            outcome: {
              type: 'pending',
              message: outcome.message,
              completionTime: pendingData?.completionTime,
            },
            serverTsMs: Date.now(),
          },
        });
        break;
      }

      case 'cancelled':
        res.status(200).json({
          status: 'ok',
          data: {
            txId,
            outcome: {
              type: 'cancelled',
              message: outcome.message,
            },
            serverTsMs: Date.now(),
          },
        });
        break;

      case 'error': {
        let statusCode = 400;
        let errorCode: AicErrorObject['code'] = 'bad_request';

        if (outcome.message?.includes('Rate limit')) {
          statusCode = 429;
          errorCode = 'rate_limited';
        } else if (outcome.message?.includes('not found')) {
          statusCode = 404;
          errorCode = 'not_found';
        } else if (outcome.message?.includes('not installed')) {
          statusCode = 403;
          errorCode = 'forbidden';
        }

        res.status(statusCode).json(
          createErrorResponse(errorCode, outcome.message ?? 'Skill invoke failed', false, {
            txId,
            reason: outcome.message,
          })
        );
        break;
      }

      default:
        res
          .status(500)
          .json(createErrorResponse('internal', 'Unknown outcome type', true, { txId }));
    }
  } catch (error) {
    console.error(`[SkillInvokeHandler] Error processing skillInvoke request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse(
          'internal',
          'Internal server error processing skillInvoke request',
          true,
          { txId }
        )
      );
  }
}
