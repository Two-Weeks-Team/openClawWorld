/**
 * Registry mapping meetingId → Colyseus MeetingRoom internal ID.
 * Allows AIC HTTP handlers to look up active MeetingRoom instances.
 */

const meetingIdToRoomId = new Map<string, string>();

export function registerMeeting(meetingId: string, colyseusRoomId: string): void {
  meetingIdToRoomId.set(meetingId, colyseusRoomId);
}

export function unregisterMeeting(meetingId: string): void {
  meetingIdToRoomId.delete(meetingId);
}

export function getColyseusRoomIdForMeeting(meetingId: string): string | undefined {
  return meetingIdToRoomId.get(meetingId);
}

export function getAllMeetingIds(): string[] {
  return Array.from(meetingIdToRoomId.keys());
}
