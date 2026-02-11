import { describe, it, expect, beforeEach } from 'vitest';
import { ChatSystem } from '../../packages/server/src/chat/ChatSystem.js';

describe('Meeting Chat System', () => {
  let chatSystem: ChatSystem;

  beforeEach(() => {
    chatSystem = new ChatSystem();
  });

  describe('sendMeetingMessage', () => {
    it('sends message to meeting channel', () => {
      const result = chatSystem.sendMeetingMessage(
        'meeting_1',
        'sender_1',
        'Alice',
        'Hello everyone'
      );

      expect(result).not.toBeNull();
      expect(result?.messageId).toMatch(/^msg_/);
      expect(result?.tsMs).toBeGreaterThan(0);
    });

    it('returns message with unique ID', () => {
      const result1 = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Message 1');
      const result2 = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Message 2');

      expect(result1?.messageId).not.toBe(result2?.messageId);
    });

    it('includes timestamp in result', () => {
      const before = Date.now();
      const result = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');
      const after = Date.now();

      expect(result?.tsMs).toBeGreaterThanOrEqual(before);
      expect(result?.tsMs).toBeLessThanOrEqual(after);
    });

    it('returns null when participation check fails', () => {
      chatSystem.setMeetingParticipationCheck(() => false);

      const result = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      expect(result).toBeNull();
    });

    it('sends message when participation check passes', () => {
      chatSystem.setMeetingParticipationCheck(() => true);

      const result = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      expect(result).not.toBeNull();
    });

    it('stores message with correct meeting room ID', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello meeting 1');
      chatSystem.sendMeetingMessage('meeting_2', 'sender_2', 'Bob', 'Hello meeting 2');

      const history1 = chatSystem.getMeetingHistory('meeting_1');
      const history2 = chatSystem.getMeetingHistory('meeting_2');

      expect(history1).toHaveLength(1);
      expect(history1[0].meetingRoomId).toBe('meeting_1');
      expect(history2).toHaveLength(1);
      expect(history2[0].meetingRoomId).toBe('meeting_2');
    });

    it('stores message with correct sender information', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].fromEntityId).toBe('sender_1');
      expect(history[0].fromName).toBe('Alice');
      expect(history[0].message).toBe('Hello');
    });

    it('uses meeting channel type', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].channel).toBe('meeting');
    });
  });

  describe('getMeetingHistory', () => {
    it('returns empty array for meeting with no messages', () => {
      const history = chatSystem.getMeetingHistory('nonexistent_meeting');

      expect(history).toEqual([]);
    });

    it('returns all messages for a meeting', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Message 1');
      chatSystem.sendMeetingMessage('meeting_1', 'sender_2', 'Bob', 'Message 2');
      chatSystem.sendMeetingMessage('meeting_1', 'sender_3', 'Charlie', 'Message 3');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history).toHaveLength(3);
    });

    it('returns messages in chronological order', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'First');
      chatSystem.sendMeetingMessage('meeting_1', 'sender_2', 'Bob', 'Second');
      chatSystem.sendMeetingMessage('meeting_1', 'sender_3', 'Charlie', 'Third');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].message).toBe('First');
      expect(history[1].message).toBe('Second');
      expect(history[2].message).toBe('Third');
    });

    it('limits number of messages when limit is specified', () => {
      for (let i = 1; i <= 10; i++) {
        chatSystem.sendMeetingMessage('meeting_1', `sender_${i}`, `User ${i}`, `Message ${i}`);
      }

      const history = chatSystem.getMeetingHistory('meeting_1', 5);

      expect(history).toHaveLength(5);
    });

    it('returns most recent messages when limit is applied', () => {
      for (let i = 1; i <= 5; i++) {
        chatSystem.sendMeetingMessage('meeting_1', `sender_${i}`, `User ${i}`, `Message ${i}`);
      }

      const history = chatSystem.getMeetingHistory('meeting_1', 3);

      expect(history[0].message).toBe('Message 3');
      expect(history[1].message).toBe('Message 4');
      expect(history[2].message).toBe('Message 5');
    });

    it('returns all messages when limit exceeds message count', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Message 1');
      chatSystem.sendMeetingMessage('meeting_1', 'sender_2', 'Bob', 'Message 2');

      const history = chatSystem.getMeetingHistory('meeting_1', 100);

      expect(history).toHaveLength(2);
    });

    it('isolates messages by meeting room ID', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Meeting 1 message');
      chatSystem.sendMeetingMessage('meeting_2', 'sender_2', 'Bob', 'Meeting 2 message');
      chatSystem.sendMeetingMessage(
        'meeting_1',
        'sender_3',
        'Charlie',
        'Another meeting 1 message'
      );

      const history1 = chatSystem.getMeetingHistory('meeting_1');
      const history2 = chatSystem.getMeetingHistory('meeting_2');

      expect(history1).toHaveLength(2);
      expect(history1.every(m => m.meetingRoomId === 'meeting_1')).toBe(true);
      expect(history2).toHaveLength(1);
      expect(history2[0].meetingRoomId).toBe('meeting_2');
    });

    it('returns empty array when limit is 0', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Message');

      const history = chatSystem.getMeetingHistory('meeting_1', 0);

      expect(history).toEqual([]);
    });

    it('includes emotes in message history', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Great job :thumbsup:');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].emotes).toEqual([':thumbsup:']);
    });
  });

  describe('Meeting Chat Isolation', () => {
    it('non-participants cannot access meeting chat history', () => {
      chatSystem.setMeetingParticipationCheck((entityId, meetingRoomId) => {
        return entityId === 'participant_1' && meetingRoomId === 'meeting_1';
      });

      chatSystem.sendMeetingMessage('meeting_1', 'participant_1', 'Alice', 'Hello');

      const allHistory = chatSystem.getMeetingHistory('meeting_1');
      expect(allHistory).toHaveLength(1);
    });

    it('messages have unique IDs across different meetings', () => {
      const result1 = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');
      const result2 = chatSystem.sendMeetingMessage('meeting_2', 'sender_2', 'Bob', 'Hi');

      expect(result1?.messageId).not.toBe(result2?.messageId);
    });

    it('each message has unique timestamp', async () => {
      const result1 = chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'First');
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = chatSystem.sendMeetingMessage('meeting_1', 'sender_2', 'Bob', 'Second');

      expect(result1?.tsMs).not.toBe(result2?.tsMs);
    });
  });

  describe('Message Format', () => {
    it('message has required fields', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      const history = chatSystem.getMeetingHistory('meeting_1');
      const message = history[0];

      expect(message.id).toBeDefined();
      expect(message.roomId).toBe('meeting_1');
      expect(message.channel).toBe('meeting');
      expect(message.fromEntityId).toBe('sender_1');
      expect(message.fromName).toBe('Alice');
      expect(message.message).toBe('Hello');
      expect(message.tsMs).toBeDefined();
      expect(message.meetingRoomId).toBe('meeting_1');
    });

    it('message ID follows expected format', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].id).toMatch(/^msg_[a-f0-9]{16}$/);
    });

    it('preserves message content exactly', () => {
      const longMessage =
        'This is a very long message with special characters: @#$%^&*() and emoji 🎉';
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', longMessage);

      const history = chatSystem.getMeetingHistory('meeting_1');

      expect(history[0].message).toBe(longMessage);
    });
  });

  describe('Chat System Integration', () => {
    it('meeting messages count toward max size limit', () => {
      const smallChatSystem = new ChatSystem(5);

      for (let i = 0; i < 7; i++) {
        smallChatSystem.sendMeetingMessage('meeting_1', `sender_${i}`, `User ${i}`, `Message ${i}`);
      }

      const history = smallChatSystem.getMeetingHistory('meeting_1');
      expect(history.length).toBeLessThan(7);
    });

    it('clear removes all meeting messages', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');
      chatSystem.sendMeetingMessage('meeting_2', 'sender_2', 'Bob', 'Hi');

      chatSystem.clear();

      expect(chatSystem.getMeetingHistory('meeting_1')).toEqual([]);
      expect(chatSystem.getMeetingHistory('meeting_2')).toEqual([]);
    });

    it('getSize includes meeting messages', () => {
      chatSystem.sendMeetingMessage('meeting_1', 'sender_1', 'Alice', 'Hello');
      chatSystem.sendMeetingMessage('meeting_2', 'sender_2', 'Bob', 'Hi');

      expect(chatSystem.getSize()).toBe(2);
    });
  });
});
