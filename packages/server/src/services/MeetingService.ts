import type { MeetingReservation, MeetingReservationStatus } from '@openclawworld/shared';
import type { RoomState } from '../schemas/RoomState.js';
import { MeetingReservationSchema } from '../schemas/MeetingReservationSchema.js';

export class MeetingService {
  private reservationCounter = 0;

  constructor(private state: RoomState) {}

  createReservation(
    orgId: string,
    meetingRoomId: string,
    name: string,
    startTime: number,
    endTime: number,
    creatorId: string
  ): MeetingReservation | null {
    if (!this.canUserReserve(creatorId, orgId)) {
      return null;
    }

    if (!this.isTimeSlotAvailable(meetingRoomId, startTime, endTime)) {
      return null;
    }

    if (endTime <= startTime) {
      return null;
    }

    const id = `reservation_${++this.reservationCounter}_${Date.now()}`;
    const schema = new MeetingReservationSchema(
      id,
      meetingRoomId,
      orgId,
      creatorId,
      name,
      startTime,
      endTime,
      'scheduled'
    );

    this.state.reservations.set(id, schema);

    return this.schemaToReservation(schema);
  }

  cancelReservation(reservationId: string, userId: string): boolean {
    const schema = this.state.reservations.get(reservationId);
    if (!schema) {
      return false;
    }

    if (schema.creatorId !== userId) {
      const entity = this.state.getEntity(userId);
      if (!entity || entity.orgId !== schema.orgId) {
        return false;
      }

      const org = this.state.organizations.get(schema.orgId);
      if (!org || org.ownerId !== userId) {
        const isAdmin = this.isOrgAdmin(userId, schema.orgId);
        if (!isAdmin) {
          return false;
        }
      }
    }

    if (schema.status === 'active' || schema.status === 'completed') {
      return false;
    }

    schema.status = 'cancelled';
    return true;
  }

  getReservations(meetingRoomId: string, date?: Date): MeetingReservation[] {
    const result: MeetingReservation[] = [];

    this.state.reservations.forEach(schema => {
      if (schema.meetingRoomId !== meetingRoomId) {
        return;
      }

      if (date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        if (schema.startTime < dayStart.getTime() || schema.startTime > dayEnd.getTime()) {
          return;
        }
      }

      result.push(this.schemaToReservation(schema));
    });

    return result.sort((a, b) => a.startTime - b.startTime);
  }

  getReservation(reservationId: string): MeetingReservation | undefined {
    const schema = this.state.reservations.get(reservationId);
    if (!schema) {
      return undefined;
    }
    return this.schemaToReservation(schema);
  }

  isTimeSlotAvailable(
    meetingRoomId: string,
    startTime: number,
    endTime: number,
    excludeReservationId?: string
  ): boolean {
    let available = true;

    this.state.reservations.forEach(schema => {
      if (!available) return;
      if (schema.meetingRoomId !== meetingRoomId) return;
      if (schema.status === 'cancelled' || schema.status === 'completed') return;
      if (excludeReservationId && schema.id === excludeReservationId) return;

      const overlaps =
        (startTime >= schema.startTime && startTime < schema.endTime) ||
        (endTime > schema.startTime && endTime <= schema.endTime) ||
        (startTime <= schema.startTime && endTime >= schema.endTime);

      if (overlaps) {
        available = false;
      }
    });

    return available;
  }

  canUserReserve(userId: string, orgId: string): boolean {
    const entity = this.state.getEntity(userId);
    if (!entity) {
      return false;
    }

    if (!entity.orgId) {
      return false;
    }

    if (entity.orgId !== orgId) {
      return false;
    }

    return true;
  }

  startMeeting(reservationId: string): string | null {
    const schema = this.state.reservations.get(reservationId);
    if (!schema) {
      return null;
    }

    if (schema.status !== 'scheduled') {
      return null;
    }

    const colyseusRoomId = `meeting_${schema.id}_${Date.now()}`;
    schema.status = 'active';
    schema.colyseusRoomId = colyseusRoomId;

    return colyseusRoomId;
  }

  endMeeting(reservationId: string): boolean {
    const schema = this.state.reservations.get(reservationId);
    if (!schema) {
      return false;
    }

    if (schema.status !== 'active') {
      return false;
    }

    schema.status = 'completed';
    return true;
  }

  getActiveMeetings(orgId?: string): MeetingReservation[] {
    const result: MeetingReservation[] = [];

    this.state.reservations.forEach(schema => {
      if (schema.status !== 'active') {
        return;
      }

      if (orgId && schema.orgId !== orgId) {
        return;
      }

      result.push(this.schemaToReservation(schema));
    });

    return result;
  }

  getUserMeetings(userId: string): MeetingReservation[] {
    const result: MeetingReservation[] = [];

    this.state.reservations.forEach(schema => {
      if (schema.creatorId !== userId) {
        return;
      }

      result.push(this.schemaToReservation(schema));
    });

    return result.sort((a, b) => a.startTime - b.startTime);
  }

  getScheduledMeetings(orgId?: string): MeetingReservation[] {
    const result: MeetingReservation[] = [];

    this.state.reservations.forEach(schema => {
      if (schema.status !== 'scheduled') {
        return;
      }

      if (orgId && schema.orgId !== orgId) {
        return;
      }

      result.push(this.schemaToReservation(schema));
    });

    return result.sort((a, b) => a.startTime - b.startTime);
  }

  updateReservationStatus(reservationId: string, status: MeetingReservationStatus): boolean {
    const schema = this.state.reservations.get(reservationId);
    if (!schema) {
      return false;
    }

    schema.status = status;
    return true;
  }

  private schemaToReservation(schema: MeetingReservationSchema): MeetingReservation {
    return {
      id: schema.id,
      meetingRoomId: schema.meetingRoomId,
      orgId: schema.orgId,
      creatorId: schema.creatorId,
      name: schema.name,
      startTime: schema.startTime,
      endTime: schema.endTime,
      status: schema.status,
      colyseusRoomId: schema.colyseusRoomId || undefined,
    };
  }

  private isOrgAdmin(userId: string, orgId: string): boolean {
    const org = this.state.organizations.get(orgId);
    if (!org) {
      return false;
    }

    let isAdmin = false;
    this.state.teams.forEach(team => {
      if (team.orgId !== orgId) return;
      const member = team.members.get(userId);
      if (member && (member.role === 'admin' || member.role === 'owner')) {
        isAdmin = true;
      }
    });

    return isAdmin;
  }
}
