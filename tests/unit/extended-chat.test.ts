import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatSystem } from '../../packages/server/src/chat/ChatSystem.js';
import { parseEmotes, replaceEmotes, EMOTES } from '../../packages/shared/src/emotes.js';

describe('Extended Chat System', () => {
  let chatSystem: ChatSystem;

  beforeEach(() => {
    chatSystem = new ChatSystem();
  });

  describe('DM Channel', () => {
    it('sends DM when targetEntityId is provided', () => {
      const result = chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private', {
        targetEntityId: 'receiver_1',
      });

      expect(result).not.toBeNull();
      expect(result?.messageId).toMatch(/^msg_/);
    });

    it('returns null when sending DM without targetEntityId', () => {
      const result = chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private');

      expect(result).toBeNull();
    });

    it('stores targetEntityId in message', () => {
      chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private', {
        targetEntityId: 'receiver_1',
      });

      const messages = chatSystem.getMessages('room_1', 'dm');
      expect(messages).toHaveLength(1);
      expect(messages[0].targetEntityId).toBe('receiver_1');
    });

    it('getMessagesForEntity shows DM to sender', () => {
      chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private', {
        targetEntityId: 'receiver_1',
      });

      const messages = chatSystem.getMessagesForEntity('room_1', 'sender_1', 'dm');
      expect(messages).toHaveLength(1);
    });

    it('getMessagesForEntity shows DM to recipient', () => {
      chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private', {
        targetEntityId: 'receiver_1',
      });

      const messages = chatSystem.getMessagesForEntity('room_1', 'receiver_1', 'dm');
      expect(messages).toHaveLength(1);
    });

    it('getMessagesForEntity hides DM from unrelated users', () => {
      chatSystem.sendMessage('room_1', 'dm', 'sender_1', 'Sender', 'Hello private', {
        targetEntityId: 'receiver_1',
      });

      const messages = chatSystem.getMessagesForEntity('room_1', 'unrelated_user', 'dm');
      expect(messages).toHaveLength(0);
    });
  });

  describe('Team Channel', () => {
    it('sends team message when membership check passes', () => {
      chatSystem.setTeamMembershipCheck(() => true);

      const result = chatSystem.sendMessage('room_1', 'team', 'sender_1', 'Sender', 'Hello team', {
        teamId: 'team_1',
      });

      expect(result).not.toBeNull();
    });

    it('returns null when team membership check fails', () => {
      chatSystem.setTeamMembershipCheck(() => false);

      const result = chatSystem.sendMessage('room_1', 'team', 'sender_1', 'Sender', 'Hello team', {
        teamId: 'team_1',
      });

      expect(result).toBeNull();
    });

    it('sends team message when no membership check is set (no validation)', () => {
      const result = chatSystem.sendMessage('room_1', 'team', 'sender_1', 'Sender', 'Hello team', {
        teamId: 'team_1',
      });

      expect(result).not.toBeNull();
    });

    it('stores teamId in message', () => {
      chatSystem.sendMessage('room_1', 'team', 'sender_1', 'Sender', 'Hello team', {
        teamId: 'team_1',
      });

      const messages = chatSystem.getMessages('room_1', 'team');
      expect(messages).toHaveLength(1);
      expect(messages[0].teamId).toBe('team_1');
    });

    it('calls membership check with correct parameters', () => {
      const checkFn = vi.fn().mockReturnValue(true);
      chatSystem.setTeamMembershipCheck(checkFn);

      chatSystem.sendMessage('room_1', 'team', 'sender_1', 'Sender', 'Hello team', {
        teamId: 'team_1',
      });

      expect(checkFn).toHaveBeenCalledWith('sender_1', 'team_1');
    });
  });

  describe('Meeting Channel', () => {
    it('sends meeting message when participation check passes', () => {
      chatSystem.setMeetingParticipationCheck(() => true);

      const result = chatSystem.sendMessage(
        'room_1',
        'meeting',
        'sender_1',
        'Sender',
        'Hello meeting',
        { meetingRoomId: 'meeting_1' }
      );

      expect(result).not.toBeNull();
    });

    it('returns null when meeting participation check fails', () => {
      chatSystem.setMeetingParticipationCheck(() => false);

      const result = chatSystem.sendMessage(
        'room_1',
        'meeting',
        'sender_1',
        'Sender',
        'Hello meeting',
        { meetingRoomId: 'meeting_1' }
      );

      expect(result).toBeNull();
    });

    it('sends meeting message when no participation check is set (no validation)', () => {
      const result = chatSystem.sendMessage(
        'room_1',
        'meeting',
        'sender_1',
        'Sender',
        'Hello meeting',
        { meetingRoomId: 'meeting_1' }
      );

      expect(result).not.toBeNull();
    });

    it('stores meetingRoomId in message', () => {
      chatSystem.sendMessage('room_1', 'meeting', 'sender_1', 'Sender', 'Hello meeting', {
        meetingRoomId: 'meeting_1',
      });

      const messages = chatSystem.getMessages('room_1', 'meeting');
      expect(messages).toHaveLength(1);
      expect(messages[0].meetingRoomId).toBe('meeting_1');
    });

    it('calls participation check with correct parameters', () => {
      const checkFn = vi.fn().mockReturnValue(true);
      chatSystem.setMeetingParticipationCheck(checkFn);

      chatSystem.sendMessage('room_1', 'meeting', 'sender_1', 'Sender', 'Hello meeting', {
        meetingRoomId: 'meeting_1',
      });

      expect(checkFn).toHaveBeenCalledWith('sender_1', 'meeting_1');
    });
  });

  describe('Emote Parsing', () => {
    it('parses single emote from message', () => {
      const emotes = parseEmotes('Hello :thumbsup:');
      expect(emotes).toEqual([':thumbsup:']);
    });

    it('parses multiple emotes from message', () => {
      const emotes = parseEmotes(':heart: :fire: :clap:');
      expect(emotes).toEqual([':heart:', ':fire:', ':clap:']);
    });

    it('returns empty array when no emotes found', () => {
      const emotes = parseEmotes('Hello world');
      expect(emotes).toEqual([]);
    });

    it('ignores invalid emote codes', () => {
      const emotes = parseEmotes(':invalid: :thumbsup:');
      expect(emotes).toEqual([':thumbsup:']);
    });

    it('replaces single emote with emoji', () => {
      const result = replaceEmotes('Hello :thumbsup:');
      expect(result).toBe('Hello 👍');
    });

    it('replaces multiple emotes with emojis', () => {
      const result = replaceEmotes(':heart: :fire:');
      expect(result).toBe('❤️ 🔥');
    });

    it('keeps invalid emote codes unchanged', () => {
      const result = replaceEmotes(':invalid: :thumbsup:');
      expect(result).toBe(':invalid: 👍');
    });

    it('stores emotes in chat message', () => {
      chatSystem.sendMessage(
        'room_1',
        'global',
        'sender_1',
        'Sender',
        'Great job :thumbsup: :fire:'
      );

      const messages = chatSystem.getMessages('room_1');
      expect(messages).toHaveLength(1);
      expect(messages[0].emotes).toEqual([':thumbsup:', ':fire:']);
    });

    it('does not store emotes field when no emotes found', () => {
      chatSystem.sendMessage('room_1', 'global', 'sender_1', 'Sender', 'Hello world');

      const messages = chatSystem.getMessages('room_1');
      expect(messages).toHaveLength(1);
      expect(messages[0].emotes).toBeUndefined();
    });

    it('has all expected emotes defined', () => {
      expect(EMOTES[':thumbsup:']).toBe('👍');
      expect(EMOTES[':thumbsdown:']).toBe('👎');
      expect(EMOTES[':heart:']).toBe('❤️');
      expect(EMOTES[':laugh:']).toBe('😂');
      expect(EMOTES[':think:']).toBe('🤔');
      expect(EMOTES[':fire:']).toBe('🔥');
      expect(EMOTES[':clap:']).toBe('👏');
      expect(EMOTES[':wave:']).toBe('👋');
    });
  });

  describe('Backward Compatibility', () => {
    it('still supports proximity channel', () => {
      const result = chatSystem.sendMessage(
        'room_1',
        'proximity',
        'sender_1',
        'Sender',
        'Hello nearby'
      );

      expect(result).not.toBeNull();

      const messages = chatSystem.getMessages('room_1', 'proximity');
      expect(messages).toHaveLength(1);
    });

    it('still supports global channel', () => {
      const result = chatSystem.sendMessage(
        'room_1',
        'global',
        'sender_1',
        'Sender',
        'Hello everyone'
      );

      expect(result).not.toBeNull();

      const messages = chatSystem.getMessages('room_1', 'global');
      expect(messages).toHaveLength(1);
    });

    it('getMessages works without channel filter', () => {
      chatSystem.sendMessage('room_1', 'proximity', 's1', 'S1', 'M1');
      chatSystem.sendMessage('room_1', 'global', 's2', 'S2', 'M2');
      chatSystem.sendMessage('room_1', 'team', 's3', 'S3', 'M3', { teamId: 't1' });

      const allMessages = chatSystem.getMessages('room_1');
      expect(allMessages).toHaveLength(3);
    });
  });
});

describe('parseEmotes', () => {
  it('extracts all valid emotes from message', () => {
    const message = 'Great work :thumbsup: :clap: :fire:';
    const result = parseEmotes(message);
    expect(result).toEqual([':thumbsup:', ':clap:', ':fire:']);
  });

  it('filters out invalid emote codes', () => {
    const message = ':unknown: :thumbsup: :invalid:';
    const result = parseEmotes(message);
    expect(result).toEqual([':thumbsup:']);
  });

  it('returns empty array for message without emotes', () => {
    const message = 'Just plain text';
    const result = parseEmotes(message);
    expect(result).toEqual([]);
  });

  it('handles empty string', () => {
    const result = parseEmotes('');
    expect(result).toEqual([]);
  });
});

describe('replaceEmotes', () => {
  it('replaces all valid emotes with emojis', () => {
    const message = 'Hello :wave: :heart:';
    const result = replaceEmotes(message);
    expect(result).toBe('Hello 👋 ❤️');
  });

  it('leaves invalid emote codes unchanged', () => {
    const message = ':invalid: :thumbsup:';
    const result = replaceEmotes(message);
    expect(result).toBe(':invalid: 👍');
  });

  it('returns plain text unchanged', () => {
    const message = 'Just plain text';
    const result = replaceEmotes(message);
    expect(result).toBe('Just plain text');
  });

  it('handles empty string', () => {
    const result = replaceEmotes('');
    expect(result).toBe('');
  });
});
