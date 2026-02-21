import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  MeetingLeaveRequest,
  MeetingLeaveResponseData,
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

export async function handleMeetingLeave(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as MeetingLeaveRequest;
  const { agentId, roomId, meetingId } = body;

  try {
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

    if (!meetingRoom.state.hasParticipant(agentId)) {
      res
        .status(404)
        .json(
          createErrorResponse(
            'agent_not_in_room',
            `Agent '${agentId}' is not in meeting '${meetingId}'`,
            false
          )
        );
      return;
    }

    const participant = meetingRoom.state.getParticipant(agentId);
    const wasHost = meetingRoom.state.isHost(agentId);

    meetingRoom.state.removeParticipant(agentId);

    // Log events
    const meetingEventLog = meetingRoom.getEventLog();
    meetingEventLog.append('meeting.participant_left' as never, meetingId, {
      meetingId,
      entityId: agentId,
      name: participant?.name ?? 'Unknown',
      reason: 'left',
    });

    const gameEventLog = gameRoom.getEventLog();
    gameEventLog.append('meeting.participant_left' as never, roomId, {
      meetingId,
      entityId: agentId,
      name: participant?.name ?? 'Unknown',
      reason: 'left',
    });

    // Auto-transfer host if the leaving agent was host
    if (wasHost && !meetingRoom.state.isEmpty()) {
      const remaining = meetingRoom.state.getAllParticipants();
      if (remaining.length > 0) {
        meetingRoom.transferHost(remaining[0].entityId);
      }
    }

    const leftAt = Date.now();

    const responseData: MeetingLeaveResponseData = {
      meetingId,
      leftAt,
      serverTsMs: leftAt,
    };

    console.log(`[MeetingLeaveHandler] Agent '${agentId}' left meeting '${meetingId}'`);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[MeetingLeaveHandler] Error:`, error);
    res.status(500).json(createErrorResponse('internal', 'Internal server error', true));
  }
}
