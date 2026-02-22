import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  ProfileUpdateRequest,
  ProfileUpdateResponseData,
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

export async function handleProfileUpdate(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ProfileUpdateRequest;
  const { agentId, roomId, status, statusMessage, title, department } = body;

  if (req.authAgentId !== agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Agent ID mismatch with auth token', false));
    return;
  }

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

    const profileService = gameRoom.getProfileService();
    profileService.updateProfile(agentEntity, {
      status,
      statusMessage,
      title,
      department,
    });

    gameRoom.getEventLog().append('profile.updated', roomId, {
      entityId: agentId,
      status,
      statusMessage,
      title,
      department,
    });

    const updatedProfile = profileService.getProfile(agentEntity);

    const responseData: ProfileUpdateResponseData = {
      applied: true,
      profile: updatedProfile,
      serverTsMs: Date.now(),
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[ProfileUpdateHandler] Error processing profile update request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse(
          'internal',
          'Internal server error processing profile update request',
          true
        )
      );
  }
}
