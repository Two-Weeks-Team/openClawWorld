import { describe, it, expect } from 'vitest';
import {
  ObserveRequestSchema,
  ObserveResponseDataSchema,
  MoveToRequestSchema,
  MoveToResponseDataSchema,
  InteractRequestSchema,
  InteractResponseDataSchema,
  ChatSendRequestSchema,
  ChatSendResponseDataSchema,
  ChatObserveRequestSchema,
  ChatObserveResponseDataSchema,
  PollEventsRequestSchema,
  PollEventsResponseDataSchema,
  EventEnvelopeSchema,
  PresenceJoinPayloadSchema,
  PresenceLeavePayloadSchema,
  ProximityEnterPayloadSchema,
  ProximityExitPayloadSchema,
  ChatMessagePayloadSchema,
  ObjectStateChangedPayloadSchema,
  IdRoomSchema,
  IdAgentSchema,
  IdEntitySchema,
  IdTxSchema,
  CursorSchema,
} from '@openclawworld/shared';

describe('Schema Validation', () => {
  describe('ID Schemas', () => {
    it('validates roomId format', () => {
      expect(IdRoomSchema.safeParse('lobby_01').success).toBe(true);
      expect(IdRoomSchema.safeParse('').success).toBe(false);
      expect(IdRoomSchema.safeParse('a'.repeat(65)).success).toBe(false);
    });

    it('validates agentId format', () => {
      expect(IdAgentSchema.safeParse('agent_helper').success).toBe(true);
      expect(IdAgentSchema.safeParse('').success).toBe(false);
    });

    it('validates entityId format', () => {
      expect(IdEntitySchema.safeParse('hum_player1').success).toBe(true);
      expect(IdEntitySchema.safeParse('agt_agent_helper').success).toBe(true);
      expect(IdEntitySchema.safeParse('obj_sign_welcome').success).toBe(true);
      expect(IdEntitySchema.safeParse('invalid_id').success).toBe(false);
    });

    it('validates txId format', () => {
      expect(IdTxSchema.safeParse('tx_abc123def456').success).toBe(true);
      expect(IdTxSchema.safeParse('invalid').success).toBe(false);
    });

    it('validates cursor format', () => {
      expect(CursorSchema.safeParse('c_0').success).toBe(true);
      expect(CursorSchema.safeParse('c_1').success).toBe(true);
    });
  });

  describe('Observe Endpoint', () => {
    const validObserveRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      radius: 100,
      detail: 'full',
      includeSelf: true,
    };

    it('validates correct observe request', () => {
      const result = ObserveRequestSchema.safeParse(validObserveRequest);
      expect(result.success).toBe(true);
    });

    it('rejects invalid radius', () => {
      const invalid = { ...validObserveRequest, radius: 0 };
      expect(ObserveRequestSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects invalid detail enum', () => {
      const invalid = { ...validObserveRequest, detail: 'invalid' };
      expect(ObserveRequestSchema.safeParse(invalid).success).toBe(false);
    });

    const validObserveResponse = {
      self: {
        id: 'agt_agent_helper',
        kind: 'agent',
        name: 'Helper Bot',
        roomId: 'lobby_01',
        pos: { x: 120.5, y: 80.0 },
        tile: { tx: 12, ty: 8 },
        facing: 'down',
      },
      nearby: [
        {
          entity: {
            id: 'hum_player1',
            kind: 'human',
            name: 'Player One',
            roomId: 'lobby_01',
            pos: { x: 100, y: 80 },
          },
          distance: 45.2,
          affords: [],
        },
        {
          entity: {
            id: 'obj_sign_welcome',
            kind: 'object',
            name: 'Welcome Sign',
            roomId: 'lobby_01',
            pos: { x: 110, y: 75 },
          },
          distance: 15.0,
          affords: [{ action: 'read', label: 'Read Sign' }],
          object: { objectType: 'sign', state: { text: 'Welcome!' } },
        },
      ],
      serverTsMs: 1707523200000,
      room: {
        roomId: 'lobby_01',
        mapId: 'lobby_map_v1',
        tickRate: 20,
      },
    };

    it('validates correct observe response', () => {
      const result = ObserveResponseDataSchema.safeParse(validObserveResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('MoveTo Endpoint', () => {
    const validMoveToRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      txId: 'tx_abc123def456',
      dest: { tx: 15, ty: 10 },
      mode: 'walk',
    };

    it('validates correct moveTo request', () => {
      const result = MoveToRequestSchema.safeParse(validMoveToRequest);
      expect(result.success).toBe(true);
    });

    it('validates without optional mode', () => {
      const withoutMode = {
        agentId: validMoveToRequest.agentId,
        roomId: validMoveToRequest.roomId,
        txId: validMoveToRequest.txId,
        dest: validMoveToRequest.dest,
      };
      expect(MoveToRequestSchema.safeParse(withoutMode).success).toBe(true);
    });

    const validMoveToResponse = {
      txId: 'tx_abc123def456',
      applied: true,
      serverTsMs: 1707523200100,
      result: 'accepted',
    };

    it('validates correct moveTo response', () => {
      const result = MoveToResponseDataSchema.safeParse(validMoveToResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Interact Endpoint', () => {
    const validInteractRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      txId: 'tx_interact_001',
      targetId: 'obj_sign_welcome',
      action: 'read',
      params: {},
    };

    it('validates correct interact request', () => {
      const result = InteractRequestSchema.safeParse(validInteractRequest);
      expect(result.success).toBe(true);
    });

    const validInteractResponse = {
      txId: 'tx_interact_001',
      applied: true,
      serverTsMs: 1707523200200,
      outcome: {
        type: 'ok',
        message: 'Welcome to OpenClawWorld!',
      },
    };

    it('validates correct interact response', () => {
      const result = InteractResponseDataSchema.safeParse(validInteractResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('ChatSend Endpoint', () => {
    const validChatSendRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      txId: 'tx_chat_001',
      channel: 'proximity',
      message: 'Hello everyone!',
    };

    it('validates correct chatSend request', () => {
      const result = ChatSendRequestSchema.safeParse(validChatSendRequest);
      expect(result.success).toBe(true);
    });

    it('rejects message too long', () => {
      const invalid = { ...validChatSendRequest, message: 'a'.repeat(501) };
      expect(ChatSendRequestSchema.safeParse(invalid).success).toBe(false);
    });

    const validChatSendResponse = {
      txId: 'tx_chat_001',
      applied: true,
      serverTsMs: 1707523200300,
      chatMessageId: 'msg_xyz789012345',
    };

    it('validates correct chatSend response', () => {
      const result = ChatSendResponseDataSchema.safeParse(validChatSendResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('ChatObserve Endpoint', () => {
    const validChatObserveRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      windowSec: 60,
      channel: 'proximity',
    };

    it('validates correct chatObserve request', () => {
      const result = ChatObserveRequestSchema.safeParse(validChatObserveRequest);
      expect(result.success).toBe(true);
    });

    const validChatObserveResponse = {
      messages: [
        {
          id: 'msg_xyz789012345',
          roomId: 'lobby_01',
          channel: 'proximity',
          fromEntityId: 'hum_player1',
          fromName: 'Player One',
          message: 'Hi there!',
          tsMs: 1707523199000,
        },
      ],
      serverTsMs: 1707523200400,
    };

    it('validates correct chatObserve response', () => {
      const result = ChatObserveResponseDataSchema.safeParse(validChatObserveResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('PollEvents Endpoint', () => {
    const validPollEventsRequest = {
      agentId: 'agent_helper',
      roomId: 'lobby_01',
      sinceCursor: 'c_0',
      limit: 50,
      waitMs: 5000,
    };

    it('validates correct pollEvents request', () => {
      const result = PollEventsRequestSchema.safeParse(validPollEventsRequest);
      expect(result.success).toBe(true);
    });

    it('validates with defaults', () => {
      const minimal = {
        agentId: 'agent_helper',
        roomId: 'lobby_01',
        sinceCursor: 'c_0',
      };
      expect(PollEventsRequestSchema.safeParse(minimal).success).toBe(true);
    });

    const validPollEventsResponse = {
      events: [
        {
          cursor: 'c_1',
          type: 'presence.join',
          roomId: 'lobby_01',
          tsMs: 1707523200000,
          payload: {
            entityId: 'hum_player2',
            name: 'Player Two',
            kind: 'human',
          },
        },
        {
          cursor: 'c_2',
          type: 'proximity.enter',
          roomId: 'lobby_01',
          tsMs: 1707523200100,
          payload: {
            subjectId: 'agt_agent_helper',
            otherId: 'hum_player2',
            distance: 45.0,
          },
        },
      ],
      nextCursor: 'c_3',
      serverTsMs: 1707523200500,
    };

    it('validates correct pollEvents response', () => {
      const result = PollEventsResponseDataSchema.safeParse(validPollEventsResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Event Payload Schemas', () => {
    it('validates presence.join payload', () => {
      const payload = {
        entityId: 'hum_player2',
        name: 'Player Two',
        kind: 'human',
      };
      expect(PresenceJoinPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates presence.leave payload', () => {
      const payload = {
        entityId: 'hum_player2',
        reason: 'disconnect',
      };
      expect(PresenceLeavePayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates proximity.enter payload', () => {
      const payload = {
        subjectId: 'agt_agent_helper',
        otherId: 'hum_player2',
        distance: 45.0,
      };
      expect(ProximityEnterPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates proximity.exit payload', () => {
      const payload = {
        subjectId: 'agt_agent_helper',
        otherId: 'hum_player2',
      };
      expect(ProximityExitPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates chat.message payload', () => {
      const payload = {
        messageId: 'msg_xyz789012345',
        fromEntityId: 'hum_player1',
        channel: 'proximity',
        message: 'Hello!',
        tsMs: 1707523199000,
      };
      expect(ChatMessagePayloadSchema.safeParse(payload).success).toBe(true);
    });

    it('validates object.state_changed payload', () => {
      const payload = {
        objectId: 'obj_sign_welcome',
        objectType: 'sign',
        patch: [{ op: 'replace', path: '/text', value: 'New text' }],
        version: 2,
      };
      expect(ObjectStateChangedPayloadSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe('Event Envelope Schema', () => {
    it('validates event envelope', () => {
      const envelope = {
        cursor: 'c_1',
        type: 'presence.join',
        roomId: 'lobby_01',
        tsMs: 1707523200000,
        payload: {
          entityId: 'hum_player2',
          name: 'Player Two',
          kind: 'human',
        },
      };
      expect(EventEnvelopeSchema.safeParse(envelope).success).toBe(true);
    });
  });
});
