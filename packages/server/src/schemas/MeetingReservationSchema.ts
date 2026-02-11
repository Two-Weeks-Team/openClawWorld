import { Schema, type } from '@colyseus/schema';
import type { MeetingReservationStatus } from '@openclawworld/shared';

export class MeetingReservationSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  meetingRoomId: string = '';

  @type('string')
  orgId: string = '';

  @type('string')
  creatorId: string = '';

  @type('string')
  name: string = '';

  @type('number')
  startTime: number = 0;

  @type('number')
  endTime: number = 0;

  @type('string')
  status: MeetingReservationStatus = 'scheduled';

  @type('string')
  colyseusRoomId: string = '';

  constructor(
    id?: string,
    meetingRoomId?: string,
    orgId?: string,
    creatorId?: string,
    name?: string,
    startTime?: number,
    endTime?: number,
    status?: MeetingReservationStatus
  ) {
    super();
    if (id !== undefined) this.id = id;
    if (meetingRoomId !== undefined) this.meetingRoomId = meetingRoomId;
    if (orgId !== undefined) this.orgId = orgId;
    if (creatorId !== undefined) this.creatorId = creatorId;
    if (name !== undefined) this.name = name;
    if (startTime !== undefined) this.startTime = startTime;
    if (endTime !== undefined) this.endTime = endTime;
    if (status !== undefined) this.status = status;
  }
}
