import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  MeetingJoinRequest,
  MeetingJoinResponseData,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import type { MeetingRoom } from '../../rooms/MeetingRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';
import { getColyseusRoomIdForMeeting } from '../meetingRegistry.js';

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean
): { status: 'error'; error: AicErrorObject } {
  return {
    status: 'error',
    error: { code, message, retryable },
  };
}

export async function handleMeetingJoin(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as MeetingJoinRequest;
  const { agentId, roomId, meetingId } = body;

  try {
    // Verify the agent exists in the game room
    const colyseusRoomId = getColyseusRoomId(roomId);
    if (!colyseusRoomId) {
      res.status(404).json(createErrorResponse('not_found', `Room '${roomId}' not found`, false));
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
            `Agent '${agentId}' not found in room '${roomId}'`,
            false
          )
        );
      return;
    }

    // Find the meeting room
    const meetingColyseusId = getColyseusRoomIdForMeeting(meetingId);
    if (!meetingColyseusId) {
      res
        .status(404)
        .json(
          createErrorResponse('not_found', `Meeting '${meetingId}' not found or not active`, false)
        );
      return;
    }

    const meetingRoom = matchMaker.getLocalRoomById(meetingColyseusId) as MeetingRoom | undefined;
    if (!meetingRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Meeting '${meetingId}' is not ready`, true));
      return;
    }

    if (meetingRoom.state.hasParticipant(agentId)) {
      res
        .status(409)
        .json(
          createErrorResponse('conflict', `Agent '${agentId}' is already in this meeting`, false)
        );
      return;
    }

    if (meetingRoom.state.isFull()) {
      res.status(409).json(createErrorResponse('conflict', 'Meeting is at capacity', false));
      return;
    }

    // Add agent as participant
    const isHost = agentId === meetingRoom.state.hostId;
    const role = isHost ? 'host' : 'participant';
    const added = meetingRoom.state.addParticipant(agentId, agentEntity.name, role);

    if (!added) {
      res.status(500).json(createErrorResponse('internal', 'Failed to join meeting', true));
      return;
    }

    // Log the event to the meeting's event log
    const meetingEventLog = meetingRoom.getEventLog();
    meetingEventLog.append('meeting.participant_joined', meetingId, {
      meetingId,
      entityId: agentId,
      name: agentEntity.name,
      role,
    });

    // Also log to game room's event log so it shows up in pollEvents
    const gameEventLog = gameRoom.getEventLog();
    gameEventLog.append('meeting.participant_joined', roomId, {
      meetingId,
      entityId: agentId,
      name: agentEntity.name,
      role,
    });

    // Build participants list
    const participants = meetingRoom.getParticipants().map(p => ({
      entityId: p.entityId,
      name: p.name,
      role: p.role,
    }));

    const responseData: MeetingJoinResponseData = {
      meetingId,
      role,
      participants,
      serverTsMs: Date.now(),
    };

    console.log(`[MeetingJoinHandler] Agent '${agentId}' joined meeting '${meetingId}' as ${role}`);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[MeetingJoinHandler] Error:`, error);
    res.status(500).json(createErrorResponse('internal', 'Internal server error', true));
  }
}
