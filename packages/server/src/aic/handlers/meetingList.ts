import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { MeetingListResponseData, AicErrorObject } from '@openclawworld/shared';
import { getAllMeetingIds, getColyseusRoomIdForMeeting } from '../meetingRegistry.js';
import type { MeetingRoom } from '../../rooms/MeetingRoom.js';

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

export async function handleMeetingList(_req: Request, res: Response): Promise<void> {

  try {
    const meetingIds = getAllMeetingIds();
    const meetings: MeetingListResponseData['meetings'] = [];

    for (const meetingId of meetingIds) {
      const colyseusRoomId = getColyseusRoomIdForMeeting(meetingId);
      if (!colyseusRoomId) continue;

      const meetingRoom = matchMaker.getLocalRoomById(colyseusRoomId) as MeetingRoom | undefined;
      if (!meetingRoom) continue;

      meetings.push({
        meetingId: meetingRoom.state.meetingId,
        name: meetingRoom.state.name,
        hostId: meetingRoom.state.hostId,
        participantCount: meetingRoom.state.getParticipantCount(),
        capacity: meetingRoom.state.capacity,
      });
    }

    const responseData: MeetingListResponseData = { meetings };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[MeetingListHandler] Error:`, error);
    res.status(500).json(createErrorResponse('internal', 'Internal server error', true));
  }
}
