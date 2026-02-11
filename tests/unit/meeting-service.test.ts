import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingService } from '../../packages/server/src/services/MeetingService.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';
import { OrganizationSchema } from '../../packages/server/src/schemas/OrganizationSchema.js';
import { TeamSchema } from '../../packages/server/src/schemas/TeamSchema.js';
import { TeamMemberSchema } from '../../packages/server/src/schemas/TeamMemberSchema.js';

describe('MeetingService', () => {
  let state: RoomState;
  let meetingService: MeetingService;
  const orgId = 'org_001';
  const meetingRoomId = 'room_001';
  const creatorId = 'entity_001';

  beforeEach(() => {
    state = new RoomState('default', 'lobby');
    meetingService = new MeetingService(state);

    const org = new OrganizationSchema(orgId, 'Test Org', creatorId);
    state.organizations.set(orgId, org);

    const entity = new EntitySchema(creatorId, 'human', 'Test User', 'default');
    entity.orgId = orgId;
    state.humans.set(creatorId, entity);
  });

  describe('createReservation', () => {
    it('creates a reservation with required fields', () => {
      const startTime = Date.now() + 3600000;
      const endTime = startTime + 3600000;

      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Team Standup',
        startTime,
        endTime,
        creatorId
      );

      expect(reservation).not.toBeNull();
      expect(reservation?.name).toBe('Team Standup');
      expect(reservation?.meetingRoomId).toBe(meetingRoomId);
      expect(reservation?.orgId).toBe(orgId);
      expect(reservation?.creatorId).toBe(creatorId);
      expect(reservation?.startTime).toBe(startTime);
      expect(reservation?.endTime).toBe(endTime);
      expect(reservation?.status).toBe('scheduled');
    });

    it('generates unique IDs for each reservation', () => {
      const startTime1 = Date.now() + 3600000;
      const startTime2 = startTime1 + 7200000;

      const res1 = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Meeting 1',
        startTime1,
        startTime1 + 3600000,
        creatorId
      );
      const res2 = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Meeting 2',
        startTime2,
        startTime2 + 3600000,
        creatorId
      );

      expect(res1?.id).not.toBe(res2?.id);
    });

    it('adds reservation to RoomState', () => {
      const startTime = Date.now() + 3600000;

      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const schema = state.reservations.get(reservation!.id);
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('Test');
    });

    it('returns null for invalid end time', () => {
      const startTime = Date.now() + 3600000;

      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime - 1000,
        creatorId
      );

      expect(reservation).toBeNull();
    });

    it('returns null when user cannot reserve', () => {
      const unknownUser = 'unknown_user';
      const startTime = Date.now() + 3600000;

      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        unknownUser
      );

      expect(reservation).toBeNull();
    });
  });

  describe('cancelReservation', () => {
    it('cancels a reservation by creator', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const result = meetingService.cancelReservation(reservation!.id, creatorId);

      expect(result).toBe(true);
      expect(meetingService.getReservation(reservation!.id)?.status).toBe('cancelled');
    });

    it('returns false for non-existent reservation', () => {
      const result = meetingService.cancelReservation('non-existent', creatorId);
      expect(result).toBe(false);
    });

    it('prevents cancellation by non-creator non-admin', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const otherUserId = 'entity_002';
      const otherEntity = new EntitySchema(otherUserId, 'human', 'Other User', 'default');
      otherEntity.orgId = orgId;
      state.humans.set(otherUserId, otherEntity);

      const result = meetingService.cancelReservation(reservation!.id, otherUserId);

      expect(result).toBe(false);
    });

    it('allows org owner to cancel any reservation', () => {
      const otherUserId = 'entity_002';
      const otherEntity = new EntitySchema(otherUserId, 'human', 'Other User', 'default');
      otherEntity.orgId = orgId;
      state.humans.set(otherUserId, otherEntity);

      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        otherUserId
      );

      const result = meetingService.cancelReservation(reservation!.id, creatorId);

      expect(result).toBe(true);
    });

    it('cannot cancel active meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(reservation!.id);
      const result = meetingService.cancelReservation(reservation!.id, creatorId);

      expect(result).toBe(false);
    });
  });

  describe('getReservations', () => {
    it('returns empty array for room with no reservations', () => {
      const reservations = meetingService.getReservations('non-existent-room');
      expect(reservations).toEqual([]);
    });

    it('returns all reservations for a room', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Meeting 1',
        startTime,
        startTime + 3600000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Meeting 2',
        startTime + 7200000,
        startTime + 10800000,
        creatorId
      );

      const reservations = meetingService.getReservations(meetingRoomId);

      expect(reservations).toHaveLength(2);
    });

    it('filters reservations by room', () => {
      const room2Id = 'room_002';
      const startTime = Date.now() + 3600000;

      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Room 1 Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        room2Id,
        'Room 2 Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const reservations = meetingService.getReservations(meetingRoomId);

      expect(reservations).toHaveLength(1);
      expect(reservations[0].name).toBe('Room 1 Meeting');
    });

    it('filters reservations by date', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStart = new Date(today);
      todayStart.setHours(10, 0, 0, 0);
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setHours(10, 0, 0, 0);

      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Today Meeting',
        todayStart.getTime(),
        todayStart.getTime() + 3600000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Tomorrow Meeting',
        tomorrowStart.getTime(),
        tomorrowStart.getTime() + 3600000,
        creatorId
      );

      const reservations = meetingService.getReservations(meetingRoomId, today);

      expect(reservations).toHaveLength(1);
      expect(reservations[0].name).toBe('Today Meeting');
    });

    it('sorts reservations by start time', () => {
      const startTime = Date.now() + 7200000;

      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Later Meeting',
        startTime + 3600000,
        startTime + 7200000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Earlier Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const reservations = meetingService.getReservations(meetingRoomId);

      expect(reservations[0].name).toBe('Earlier Meeting');
      expect(reservations[1].name).toBe('Later Meeting');
    });
  });

  describe('getReservation', () => {
    it('returns reservation by ID', () => {
      const startTime = Date.now() + 3600000;
      const created = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const found = meetingService.getReservation(created!.id);

      expect(found).not.toBeUndefined();
      expect(found?.name).toBe('Test');
    });

    it('returns undefined for non-existent reservation', () => {
      const found = meetingService.getReservation('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('isTimeSlotAvailable', () => {
    it('returns true for empty room', () => {
      const startTime = Date.now() + 3600000;
      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime,
        startTime + 3600000
      );

      expect(available).toBe(true);
    });

    it('returns true for non-overlapping slot', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime + 7200000,
        startTime + 10800000
      );

      expect(available).toBe(true);
    });

    it('returns false for overlapping start', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime + 1800000,
        startTime + 5400000
      );

      expect(available).toBe(false);
    });

    it('returns false for overlapping end', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime - 1800000,
        startTime + 1800000
      );

      expect(available).toBe(false);
    });

    it('returns false for containing overlap', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime - 1800000,
        startTime + 5400000
      );

      expect(available).toBe(false);
    });

    it('returns false for contained overlap', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime + 900000,
        startTime + 2700000
      );

      expect(available).toBe(false);
    });

    it('ignores cancelled reservations', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.cancelReservation(reservation!.id, creatorId);

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime,
        startTime + 3600000
      );

      expect(available).toBe(true);
    });

    it('ignores completed reservations', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(reservation!.id);
      meetingService.endMeeting(reservation!.id);

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime,
        startTime + 3600000
      );

      expect(available).toBe(true);
    });

    it('can exclude specific reservation', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Existing',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const available = meetingService.isTimeSlotAvailable(
        meetingRoomId,
        startTime,
        startTime + 3600000,
        reservation!.id
      );

      expect(available).toBe(true);
    });
  });

  describe('canUserReserve', () => {
    it('returns true for org member', () => {
      const canReserve = meetingService.canUserReserve(creatorId, orgId);
      expect(canReserve).toBe(true);
    });

    it('returns false for unknown user', () => {
      const canReserve = meetingService.canUserReserve('unknown', orgId);
      expect(canReserve).toBe(false);
    });

    it('returns false for user in different org', () => {
      const otherOrgId = 'org_002';
      const canReserve = meetingService.canUserReserve(creatorId, otherOrgId);
      expect(canReserve).toBe(false);
    });

    it('returns false for user without org', () => {
      const noOrgUserId = 'entity_no_org';
      const noOrgEntity = new EntitySchema(noOrgUserId, 'human', 'No Org User', 'default');
      state.humans.set(noOrgUserId, noOrgEntity);

      const canReserve = meetingService.canUserReserve(noOrgUserId, orgId);
      expect(canReserve).toBe(false);
    });
  });

  describe('startMeeting', () => {
    it('starts a scheduled meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const colyseusRoomId = meetingService.startMeeting(reservation!.id);

      expect(colyseusRoomId).not.toBeNull();
      expect(colyseusRoomId).toContain('meeting_');
      expect(meetingService.getReservation(reservation!.id)?.status).toBe('active');
    });

    it('returns null for non-existent reservation', () => {
      const colyseusRoomId = meetingService.startMeeting('non-existent');
      expect(colyseusRoomId).toBeNull();
    });

    it('returns null for already started meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(reservation!.id);
      const secondStart = meetingService.startMeeting(reservation!.id);

      expect(secondStart).toBeNull();
    });

    it('returns null for cancelled meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.cancelReservation(reservation!.id, creatorId);
      const colyseusRoomId = meetingService.startMeeting(reservation!.id);

      expect(colyseusRoomId).toBeNull();
    });

    it('stores colyseus room ID in reservation', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const colyseusRoomId = meetingService.startMeeting(reservation!.id);
      const updated = meetingService.getReservation(reservation!.id);

      expect(updated?.colyseusRoomId).toBe(colyseusRoomId);
    });
  });

  describe('endMeeting', () => {
    it('ends an active meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(reservation!.id);
      const result = meetingService.endMeeting(reservation!.id);

      expect(result).toBe(true);
      expect(meetingService.getReservation(reservation!.id)?.status).toBe('completed');
    });

    it('returns false for non-existent reservation', () => {
      const result = meetingService.endMeeting('non-existent');
      expect(result).toBe(false);
    });

    it('returns false for scheduled meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const result = meetingService.endMeeting(reservation!.id);

      expect(result).toBe(false);
    });

    it('returns false for already ended meeting', () => {
      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(reservation!.id);
      meetingService.endMeeting(reservation!.id);
      const result = meetingService.endMeeting(reservation!.id);

      expect(result).toBe(false);
    });
  });

  describe('getActiveMeetings', () => {
    it('returns empty array when no active meetings', () => {
      const activeMeetings = meetingService.getActiveMeetings();
      expect(activeMeetings).toEqual([]);
    });

    it('returns all active meetings', () => {
      const startTime = Date.now() + 3600000;
      const res1 = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Active 1',
        startTime,
        startTime + 3600000,
        creatorId
      );
      const res2 = meetingService.createReservation(
        orgId,
        'room_002',
        'Active 2',
        startTime,
        startTime + 3600000,
        creatorId
      );

      meetingService.startMeeting(res1!.id);
      meetingService.startMeeting(res2!.id);

      const activeMeetings = meetingService.getActiveMeetings();

      expect(activeMeetings).toHaveLength(2);
    });

    it('filters by orgId', () => {
      const org2Id = 'org_002';
      const org2 = new OrganizationSchema(org2Id, 'Org 2', 'owner2');
      state.organizations.set(org2Id, org2);

      const user2Id = 'entity_002';
      const user2 = new EntitySchema(user2Id, 'human', 'User 2', 'default');
      user2.orgId = org2Id;
      state.humans.set(user2Id, user2);

      const startTime = Date.now() + 3600000;
      const res1 = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Org 1 Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );
      const res2 = meetingService.createReservation(
        org2Id,
        'room_002',
        'Org 2 Meeting',
        startTime,
        startTime + 3600000,
        user2Id
      );

      meetingService.startMeeting(res1!.id);
      meetingService.startMeeting(res2!.id);

      const activeMeetings = meetingService.getActiveMeetings(orgId);

      expect(activeMeetings).toHaveLength(1);
      expect(activeMeetings[0].name).toBe('Org 1 Meeting');
    });

    it('excludes scheduled meetings', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Scheduled',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const activeMeetings = meetingService.getActiveMeetings();

      expect(activeMeetings).toHaveLength(0);
    });
  });

  describe('getUserMeetings', () => {
    it('returns empty array for user with no meetings', () => {
      const meetings = meetingService.getUserMeetings('unknown');
      expect(meetings).toEqual([]);
    });

    it('returns all meetings for user', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Meeting 1',
        startTime,
        startTime + 3600000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        'room_002',
        'Meeting 2',
        startTime + 7200000,
        startTime + 10800000,
        creatorId
      );

      const meetings = meetingService.getUserMeetings(creatorId);

      expect(meetings).toHaveLength(2);
    });

    it('only returns meetings created by user', () => {
      const otherUserId = 'entity_002';
      const otherEntity = new EntitySchema(otherUserId, 'human', 'Other User', 'default');
      otherEntity.orgId = orgId;
      state.humans.set(otherUserId, otherEntity);

      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Creator Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        'room_002',
        'Other Meeting',
        startTime + 7200000,
        startTime + 10800000,
        otherUserId
      );

      const meetings = meetingService.getUserMeetings(creatorId);

      expect(meetings).toHaveLength(1);
      expect(meetings[0].name).toBe('Creator Meeting');
    });

    it('sorts by start time', () => {
      const startTime = Date.now() + 7200000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Later Meeting',
        startTime + 3600000,
        startTime + 7200000,
        creatorId
      );
      meetingService.createReservation(
        orgId,
        'room_002',
        'Earlier Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const meetings = meetingService.getUserMeetings(creatorId);

      expect(meetings[0].name).toBe('Earlier Meeting');
      expect(meetings[1].name).toBe('Later Meeting');
    });
  });

  describe('getScheduledMeetings', () => {
    it('returns only scheduled meetings', () => {
      const startTime = Date.now() + 3600000;
      const scheduled = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Scheduled',
        startTime,
        startTime + 3600000,
        creatorId
      );
      const active = meetingService.createReservation(
        orgId,
        'room_002',
        'Active',
        startTime + 7200000,
        startTime + 10800000,
        creatorId
      );

      meetingService.startMeeting(active!.id);

      const scheduledMeetings = meetingService.getScheduledMeetings();

      expect(scheduledMeetings).toHaveLength(1);
      expect(scheduledMeetings[0].id).toBe(scheduled!.id);
    });

    it('filters by orgId', () => {
      const org2Id = 'org_002';
      const org2 = new OrganizationSchema(org2Id, 'Org 2', 'owner2');
      state.organizations.set(org2Id, org2);

      const user2Id = 'entity_002';
      const user2 = new EntitySchema(user2Id, 'human', 'User 2', 'default');
      user2.orgId = org2Id;
      state.humans.set(user2Id, user2);

      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Org 1 Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );
      meetingService.createReservation(
        org2Id,
        'room_002',
        'Org 2 Meeting',
        startTime,
        startTime + 3600000,
        user2Id
      );

      const scheduledMeetings = meetingService.getScheduledMeetings(orgId);

      expect(scheduledMeetings).toHaveLength(1);
      expect(scheduledMeetings[0].name).toBe('Org 1 Meeting');
    });
  });

  describe('double-booking prevention', () => {
    it('prevents creating overlapping reservation', () => {
      const startTime = Date.now() + 3600000;
      meetingService.createReservation(
        orgId,
        meetingRoomId,
        'First Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const overlapping = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Overlapping Meeting',
        startTime + 1800000,
        startTime + 5400000,
        creatorId
      );

      expect(overlapping).toBeNull();
    });

    it('allows non-overlapping reservations', () => {
      const startTime = Date.now() + 3600000;
      const first = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'First Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );
      const second = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Second Meeting',
        startTime + 3600000,
        startTime + 7200000,
        creatorId
      );

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });

  describe('admin cancellation', () => {
    it('allows org admin to cancel reservations', () => {
      const adminId = 'entity_admin';
      const adminEntity = new EntitySchema(adminId, 'human', 'Admin User', 'default');
      adminEntity.orgId = orgId;
      state.humans.set(adminId, adminEntity);

      const team = new TeamSchema('team_001', orgId, 'Admin Team');
      const adminMember = new TeamMemberSchema(adminId, 'admin');
      team.members.set(adminId, adminMember);
      state.teams.set(team.id, team);

      const startTime = Date.now() + 3600000;
      const reservation = meetingService.createReservation(
        orgId,
        meetingRoomId,
        'Test Meeting',
        startTime,
        startTime + 3600000,
        creatorId
      );

      const result = meetingService.cancelReservation(reservation!.id, adminId);

      expect(result).toBe(true);
    });
  });
});
