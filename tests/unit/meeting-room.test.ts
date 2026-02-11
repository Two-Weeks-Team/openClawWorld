import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MeetingRoomState,
  MeetingParticipant,
  DEFAULT_MEETING_CAPACITY,
} from '../../packages/server/src/schemas/MeetingRoomState.js';

describe('MeetingParticipant', () => {
  describe('constructor', () => {
    it('creates participant with default values', () => {
      const participant = new MeetingParticipant();

      expect(participant.entityId).toBe('');
      expect(participant.name).toBe('');
      expect(participant.role).toBe('participant');
      expect(participant.joinedAt).toBeGreaterThan(0);
    });

    it('creates participant with provided values', () => {
      const participant = new MeetingParticipant('entity_001', 'Alice', 'host');

      expect(participant.entityId).toBe('entity_001');
      expect(participant.name).toBe('Alice');
      expect(participant.role).toBe('host');
    });

    it('sets joinedAt to current timestamp', () => {
      const before = Date.now();
      const participant = new MeetingParticipant('entity_001', 'Alice', 'participant');
      const after = Date.now();

      expect(participant.joinedAt).toBeGreaterThanOrEqual(before);
      expect(participant.joinedAt).toBeLessThanOrEqual(after);
    });
  });
});

describe('MeetingRoomState', () => {
  describe('constructor', () => {
    it('creates state with default values', () => {
      const state = new MeetingRoomState();

      expect(state.meetingId).toBe('');
      expect(state.orgId).toBe('');
      expect(state.name).toBe('');
      expect(state.capacity).toBe(DEFAULT_MEETING_CAPACITY);
      expect(state.hostId).toBe('');
      expect(state.startedAt).toBeGreaterThan(0);
      expect(state.participants.size).toBe(0);
    });

    it('creates state with provided values', () => {
      const state = new MeetingRoomState(
        'meeting_001',
        'org_001',
        'Sprint Planning',
        'host_001',
        10
      );

      expect(state.meetingId).toBe('meeting_001');
      expect(state.orgId).toBe('org_001');
      expect(state.name).toBe('Sprint Planning');
      expect(state.hostId).toBe('host_001');
      expect(state.capacity).toBe(10);
    });

    it('uses default capacity when not provided', () => {
      const state = new MeetingRoomState('meeting_001', 'org_001', 'Sprint Planning', 'host_001');

      expect(state.capacity).toBe(DEFAULT_MEETING_CAPACITY);
    });

    it('initializes agenda as AgendaSchema instance', () => {
      const state = new MeetingRoomState();

      expect(state.agenda).toBeDefined();
      expect(state.agenda.items).toBeDefined();
      expect(state.whiteboard).toBeNull();
      expect(state.activeVote).toBeNull();
    });
  });

  describe('addParticipant', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001', 5);
    });

    it('adds participant successfully', () => {
      const result = state.addParticipant('entity_001', 'Alice', 'participant');

      expect(result).toBe(true);
      expect(state.participants.size).toBe(1);
    });

    it('returns false when at capacity', () => {
      state.addParticipant('entity_001', 'Alice', 'participant');
      state.addParticipant('entity_002', 'Bob', 'participant');
      state.addParticipant('entity_003', 'Charlie', 'participant');
      state.addParticipant('entity_004', 'David', 'participant');
      state.addParticipant('entity_005', 'Eve', 'participant');

      const result = state.addParticipant('entity_006', 'Frank', 'participant');

      expect(result).toBe(false);
      expect(state.participants.size).toBe(5);
    });

    it('returns false for duplicate participant', () => {
      state.addParticipant('entity_001', 'Alice', 'participant');

      const result = state.addParticipant('entity_001', 'Alice', 'participant');

      expect(result).toBe(false);
      expect(state.participants.size).toBe(1);
    });

    it('defaults role to participant', () => {
      state.addParticipant('entity_001', 'Alice');

      const participant = state.getParticipant('entity_001');
      expect(participant?.role).toBe('participant');
    });
  });

  describe('removeParticipant', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
      state.addParticipant('entity_001', 'Alice', 'participant');
    });

    it('removes participant successfully', () => {
      const result = state.removeParticipant('entity_001');

      expect(result).toBe(true);
      expect(state.participants.size).toBe(0);
    });

    it('returns false for non-existent participant', () => {
      const result = state.removeParticipant('entity_999');

      expect(result).toBe(false);
    });
  });

  describe('getParticipant', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
      state.addParticipant('entity_001', 'Alice', 'participant');
    });

    it('returns participant by ID', () => {
      const participant = state.getParticipant('entity_001');

      expect(participant).toBeDefined();
      expect(participant?.name).toBe('Alice');
    });

    it('returns undefined for non-existent participant', () => {
      const participant = state.getParticipant('entity_999');

      expect(participant).toBeUndefined();
    });
  });

  describe('hasParticipant', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
      state.addParticipant('entity_001', 'Alice', 'participant');
    });

    it('returns true for existing participant', () => {
      expect(state.hasParticipant('entity_001')).toBe(true);
    });

    it('returns false for non-existent participant', () => {
      expect(state.hasParticipant('entity_999')).toBe(false);
    });
  });

  describe('getParticipantCount', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
    });

    it('returns correct count', () => {
      expect(state.getParticipantCount()).toBe(0);

      state.addParticipant('entity_001', 'Alice', 'participant');
      expect(state.getParticipantCount()).toBe(1);

      state.addParticipant('entity_002', 'Bob', 'participant');
      expect(state.getParticipantCount()).toBe(2);
    });
  });

  describe('isHost', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
    });

    it('returns true for host', () => {
      expect(state.isHost('host_001')).toBe(true);
    });

    it('returns false for non-host', () => {
      expect(state.isHost('entity_001')).toBe(false);
    });
  });

  describe('setHost', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
      state.addParticipant('host_001', 'Original Host', 'host');
      state.addParticipant('entity_001', 'Alice', 'participant');
    });

    it('transfers host to existing participant', () => {
      const result = state.setHost('entity_001');

      expect(result).toBe(true);
      expect(state.hostId).toBe('entity_001');
      expect(state.getParticipant('entity_001')?.role).toBe('host');
    });

    it('demotes previous host to participant', () => {
      state.setHost('entity_001');

      expect(state.getParticipant('host_001')?.role).toBe('participant');
    });

    it('returns false for non-existent participant', () => {
      const result = state.setHost('entity_999');

      expect(result).toBe(false);
      expect(state.hostId).toBe('host_001');
    });
  });

  describe('getAllParticipants', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
    });

    it('returns empty array when no participants', () => {
      const participants = state.getAllParticipants();

      expect(participants).toHaveLength(0);
    });

    it('returns all participants', () => {
      state.addParticipant('entity_001', 'Alice', 'host');
      state.addParticipant('entity_002', 'Bob', 'participant');

      const participants = state.getAllParticipants();

      expect(participants).toHaveLength(2);
    });
  });

  describe('isFull', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001', 2);
    });

    it('returns false when not at capacity', () => {
      expect(state.isFull()).toBe(false);

      state.addParticipant('entity_001', 'Alice', 'participant');
      expect(state.isFull()).toBe(false);
    });

    it('returns true when at capacity', () => {
      state.addParticipant('entity_001', 'Alice', 'participant');
      state.addParticipant('entity_002', 'Bob', 'participant');

      expect(state.isFull()).toBe(true);
    });
  });

  describe('isEmpty', () => {
    let state: MeetingRoomState;

    beforeEach(() => {
      state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');
    });

    it('returns true when no participants', () => {
      expect(state.isEmpty()).toBe(true);
    });

    it('returns false when has participants', () => {
      state.addParticipant('entity_001', 'Alice', 'participant');

      expect(state.isEmpty()).toBe(false);
    });
  });
});

describe('MeetingRoom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('MeetingRoom class import', () => {
    it('can be imported', async () => {
      const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
      expect(MeetingRoom).toBeDefined();
    });

    it('has required methods', async () => {
      const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
      const room = new MeetingRoom();

      expect(typeof room.onCreate).toBe('function');
      expect(typeof room.onJoin).toBe('function');
      expect(typeof room.onLeave).toBe('function');
      expect(typeof room.onDispose).toBe('function');
      expect(typeof room.endMeeting).toBe('function');
      expect(typeof room.transferHost).toBe('function');
      expect(typeof room.getParticipants).toBe('function');
    });

    it('has getChatSystem method', async () => {
      const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
      const room = new MeetingRoom();

      expect(typeof room.getChatSystem).toBe('function');
    });

    it('has getEventLog method', async () => {
      const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
      const room = new MeetingRoom();

      expect(typeof room.getEventLog).toBe('function');
    });
  });

  describe('MeetingRoom state management via schema', () => {
    it('correctly initializes state through schema', () => {
      const state = new MeetingRoomState('meeting_123', 'org_456', 'Team Standup', 'host_789', 15);

      expect(state.meetingId).toBe('meeting_123');
      expect(state.orgId).toBe('org_456');
      expect(state.name).toBe('Team Standup');
      expect(state.hostId).toBe('host_789');
      expect(state.capacity).toBe(15);
    });
  });
});

describe('Integration: MeetingRoom with MeetingRoomState', () => {
  it('state properly tracks multiple participants', () => {
    const state = new MeetingRoomState('meeting_001', 'org_001', 'Team Meeting', 'host_001', 10);

    state.addParticipant('host_001', 'Host User', 'host');
    state.addParticipant('user_001', 'User One', 'participant');
    state.addParticipant('user_002', 'User Two', 'participant');

    expect(state.getParticipantCount()).toBe(3);
    expect(state.isHost('host_001')).toBe(true);
    expect(state.isHost('user_001')).toBe(false);
  });

  it('correctly handles host transfer chain', () => {
    const state = new MeetingRoomState('meeting_001', 'org_001', 'Team Meeting', 'host_001');

    state.addParticipant('host_001', 'Original Host', 'host');
    state.addParticipant('user_001', 'User One', 'participant');
    state.addParticipant('user_002', 'User Two', 'participant');

    state.setHost('user_001');
    expect(state.hostId).toBe('user_001');
    expect(state.getParticipant('user_001')?.role).toBe('host');
    expect(state.getParticipant('host_001')?.role).toBe('participant');

    state.setHost('user_002');
    expect(state.hostId).toBe('user_002');
    expect(state.getParticipant('user_002')?.role).toBe('host');
    expect(state.getParticipant('user_001')?.role).toBe('participant');
  });

  it('maintains capacity after participant removal', () => {
    const state = new MeetingRoomState('meeting_001', 'org_001', 'Team Meeting', 'host_001', 3);

    state.addParticipant('user_001', 'User One', 'participant');
    state.addParticipant('user_002', 'User Two', 'participant');
    state.addParticipant('user_003', 'User Three', 'participant');

    expect(state.isFull()).toBe(true);
    expect(state.addParticipant('user_004', 'User Four', 'participant')).toBe(false);

    state.removeParticipant('user_002');

    expect(state.isFull()).toBe(false);
    expect(state.addParticipant('user_004', 'User Four', 'participant')).toBe(true);
  });

  it('handles empty state correctly after all leave', () => {
    const state = new MeetingRoomState('meeting_001', 'org_001', 'Team Meeting', 'host_001');

    state.addParticipant('user_001', 'User One', 'participant');
    state.addParticipant('user_002', 'User Two', 'participant');

    expect(state.isEmpty()).toBe(false);

    state.removeParticipant('user_001');
    state.removeParticipant('user_002');

    expect(state.isEmpty()).toBe(true);
    expect(state.getParticipantCount()).toBe(0);
  });
});

describe('MeetingRoom event logging', () => {
  it('EventLog can be accessed from MeetingRoom', async () => {
    const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
    const room = new MeetingRoom();
    const eventLog = room.getEventLog();

    expect(eventLog).toBeDefined();
    expect(typeof eventLog.append).toBe('function');
    expect(typeof eventLog.getSince).toBe('function');
  });
});

describe('MeetingRoom chat system', () => {
  it('ChatSystem can be accessed from MeetingRoom', async () => {
    const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
    const room = new MeetingRoom();
    const chatSystem = room.getChatSystem();

    expect(chatSystem).toBeDefined();
    expect(typeof chatSystem.sendMessage).toBe('function');
    expect(typeof chatSystem.getMessages).toBe('function');
  });
});
