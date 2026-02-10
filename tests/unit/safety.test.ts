import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyService } from '../../packages/server/src/services/SafetyService.js';
import { ChatSystem } from '../../packages/server/src/chat/ChatSystem.js';

describe('SafetyService', () => {
  let safetyService: SafetyService;

  beforeEach(() => {
    safetyService = new SafetyService();
  });

  describe('reportUser', () => {
    it('creates a report with pending status', () => {
      const report = safetyService.reportUser('reporter_1', 'target_1', 'Harassment');

      expect(report.id).toMatch(/^report_/);
      expect(report.reporterId).toBe('reporter_1');
      expect(report.targetId).toBe('target_1');
      expect(report.reason).toBe('Harassment');
      expect(report.status).toBe('pending');
      expect(report.createdAt).toBeGreaterThan(0);
    });

    it('stores report for later retrieval', () => {
      const report = safetyService.reportUser('reporter_1', 'target_1', 'Spam');

      const retrieved = safetyService.getReport(report.id);
      expect(retrieved).toEqual(report);
    });

    it('generates unique report IDs', () => {
      const report1 = safetyService.reportUser('r1', 't1', 'reason1');
      const report2 = safetyService.reportUser('r2', 't2', 'reason2');

      expect(report1.id).not.toBe(report2.id);
    });
  });

  describe('getReports', () => {
    it('returns all reports when no status filter', () => {
      safetyService.reportUser('r1', 't1', 'reason1');
      safetyService.reportUser('r2', 't2', 'reason2');

      const reports = safetyService.getReports();
      expect(reports).toHaveLength(2);
    });

    it('filters reports by status', () => {
      const report1 = safetyService.reportUser('r1', 't1', 'reason1');
      safetyService.reportUser('r2', 't2', 'reason2');

      safetyService.updateReportStatus(report1.id, 'resolved');

      expect(safetyService.getReports('pending')).toHaveLength(1);
      expect(safetyService.getReports('resolved')).toHaveLength(1);
      expect(safetyService.getReports('reviewed')).toHaveLength(0);
    });
  });

  describe('updateReportStatus', () => {
    it('updates report status successfully', () => {
      const report = safetyService.reportUser('r1', 't1', 'reason');

      const result = safetyService.updateReportStatus(report.id, 'reviewed');
      expect(result).toBe(true);

      const updated = safetyService.getReport(report.id);
      expect(updated?.status).toBe('reviewed');
    });

    it('returns false for non-existent report', () => {
      const result = safetyService.updateReportStatus('nonexistent', 'resolved');
      expect(result).toBe(false);
    });
  });

  describe('blockUser', () => {
    it('blocks a user', () => {
      safetyService.blockUser('blocker_1', 'blocked_1');

      expect(safetyService.isBlocked('blocker_1', 'blocked_1')).toBe(true);
    });

    it('does not create reverse block', () => {
      safetyService.blockUser('blocker_1', 'blocked_1');

      expect(safetyService.isBlocked('blocked_1', 'blocker_1')).toBe(false);
    });

    it('allows multiple blocks from same user', () => {
      safetyService.blockUser('blocker_1', 'blocked_1');
      safetyService.blockUser('blocker_1', 'blocked_2');

      expect(safetyService.isBlocked('blocker_1', 'blocked_1')).toBe(true);
      expect(safetyService.isBlocked('blocker_1', 'blocked_2')).toBe(true);
    });
  });

  describe('unblockUser', () => {
    it('unblocks a previously blocked user', () => {
      safetyService.blockUser('blocker_1', 'blocked_1');
      safetyService.unblockUser('blocker_1', 'blocked_1');

      expect(safetyService.isBlocked('blocker_1', 'blocked_1')).toBe(false);
    });

    it('handles unblock of non-blocked user gracefully', () => {
      expect(() => safetyService.unblockUser('blocker_1', 'never_blocked')).not.toThrow();
    });
  });

  describe('isBlocked', () => {
    it('returns false when no block exists', () => {
      expect(safetyService.isBlocked('entity_1', 'entity_2')).toBe(false);
    });

    it('returns true when block exists', () => {
      safetyService.blockUser('entity_1', 'entity_2');
      expect(safetyService.isBlocked('entity_1', 'entity_2')).toBe(true);
    });
  });

  describe('isBlockedEitherWay', () => {
    it('returns true when A blocked B', () => {
      safetyService.blockUser('entity_a', 'entity_b');

      expect(safetyService.isBlockedEitherWay('entity_a', 'entity_b')).toBe(true);
      expect(safetyService.isBlockedEitherWay('entity_b', 'entity_a')).toBe(true);
    });

    it('returns true when B blocked A', () => {
      safetyService.blockUser('entity_b', 'entity_a');

      expect(safetyService.isBlockedEitherWay('entity_a', 'entity_b')).toBe(true);
      expect(safetyService.isBlockedEitherWay('entity_b', 'entity_a')).toBe(true);
    });

    it('returns false when neither blocked', () => {
      expect(safetyService.isBlockedEitherWay('entity_a', 'entity_b')).toBe(false);
    });
  });

  describe('getBlockedUsers', () => {
    it('returns empty array when no blocks', () => {
      expect(safetyService.getBlockedUsers('entity_1')).toEqual([]);
    });

    it('returns all blocked user IDs', () => {
      safetyService.blockUser('blocker', 'blocked_1');
      safetyService.blockUser('blocker', 'blocked_2');

      const blocked = safetyService.getBlockedUsers('blocker');
      expect(blocked).toHaveLength(2);
      expect(blocked).toContain('blocked_1');
      expect(blocked).toContain('blocked_2');
    });
  });

  describe('muteUser', () => {
    it('creates a mute record without expiration', () => {
      const mute = safetyService.muteUser('org_1', 'muted_1', 'moderator_1');

      expect(mute.orgId).toBe('org_1');
      expect(mute.mutedId).toBe('muted_1');
      expect(mute.mutedBy).toBe('moderator_1');
      expect(mute.createdAt).toBeGreaterThan(0);
      expect(mute.expiresAt).toBeUndefined();
    });

    it('creates a mute record with expiration', () => {
      const durationMs = 3600000;
      const beforeMute = Date.now();
      const mute = safetyService.muteUser('org_1', 'muted_1', 'moderator_1', durationMs);

      expect(mute.expiresAt).toBeDefined();
      expect(mute.expiresAt).toBeGreaterThanOrEqual(beforeMute + durationMs);
    });

    it('replaces existing mute for same user', () => {
      safetyService.muteUser('org_1', 'muted_1', 'mod_1', 1000);
      safetyService.muteUser('org_1', 'muted_1', 'mod_2', 2000);

      const mutes = safetyService.getMutedUsers('org_1');
      expect(mutes).toHaveLength(1);
      expect(mutes[0].mutedBy).toBe('mod_2');
    });
  });

  describe('unmuteUser', () => {
    it('removes mute record', () => {
      safetyService.muteUser('org_1', 'muted_1', 'mod_1');
      safetyService.unmuteUser('org_1', 'muted_1');

      expect(safetyService.isMuted('org_1', 'muted_1')).toBe(false);
    });

    it('handles unmute of non-muted user gracefully', () => {
      expect(() => safetyService.unmuteUser('org_1', 'never_muted')).not.toThrow();
    });
  });

  describe('isMuted', () => {
    it('returns true for active mute', () => {
      safetyService.muteUser('org_1', 'muted_1', 'mod_1');

      expect(safetyService.isMuted('org_1', 'muted_1')).toBe(true);
    });

    it('returns false for non-muted user', () => {
      expect(safetyService.isMuted('org_1', 'not_muted')).toBe(false);
    });

    it('returns false for expired mute', async () => {
      safetyService.muteUser('org_1', 'muted_1', 'mod_1', 1);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(safetyService.isMuted('org_1', 'muted_1')).toBe(false);
    });

    it('returns false for non-existent org', () => {
      expect(safetyService.isMuted('nonexistent_org', 'entity_1')).toBe(false);
    });
  });

  describe('getMutedUsers', () => {
    it('returns empty array for org with no mutes', () => {
      expect(safetyService.getMutedUsers('org_1')).toEqual([]);
    });

    it('returns all muted users in org', () => {
      safetyService.muteUser('org_1', 'muted_1', 'mod_1');
      safetyService.muteUser('org_1', 'muted_2', 'mod_1');

      const mutes = safetyService.getMutedUsers('org_1');
      expect(mutes).toHaveLength(2);
    });
  });

  describe('state serialization', () => {
    it('serializes and deserializes state correctly', () => {
      safetyService.reportUser('r1', 't1', 'reason');
      safetyService.blockUser('b1', 'blocked1');
      safetyService.muteUser('org1', 'muted1', 'mod1');

      const state = safetyService.getState();

      const newService = new SafetyService();
      newService.loadState(state);

      expect(newService.getReports()).toHaveLength(1);
      expect(newService.isBlocked('b1', 'blocked1')).toBe(true);
      expect(newService.isMuted('org1', 'muted1')).toBe(true);
    });

    it('clear removes all data', () => {
      safetyService.reportUser('r1', 't1', 'reason');
      safetyService.blockUser('b1', 'blocked1');
      safetyService.muteUser('org1', 'muted1', 'mod1');

      safetyService.clear();

      expect(safetyService.getReports()).toHaveLength(0);
      expect(safetyService.isBlocked('b1', 'blocked1')).toBe(false);
      expect(safetyService.isMuted('org1', 'muted1')).toBe(false);
    });
  });
});

describe('ChatSystem with SafetyService integration', () => {
  let chatSystem: ChatSystem;
  let safetyService: SafetyService;

  beforeEach(() => {
    safetyService = new SafetyService();
    chatSystem = new ChatSystem();
    chatSystem.setSafetyService(safetyService);
  });

  describe('getMessagesForEntity', () => {
    it('filters out messages from blocked users', () => {
      chatSystem.sendMessage('room_1', 'global', 'sender_1', 'Sender 1', 'Hello');
      chatSystem.sendMessage('room_1', 'global', 'sender_2', 'Sender 2', 'Hi');
      chatSystem.sendMessage('room_1', 'global', 'sender_3', 'Sender 3', 'Hey');

      safetyService.blockUser('viewer', 'sender_2');

      const messages = chatSystem.getMessagesForEntity('room_1', 'viewer');

      expect(messages).toHaveLength(2);
      expect(messages.map(m => m.fromEntityId)).not.toContain('sender_2');
    });

    it('filters out messages when viewer is blocked by sender', () => {
      chatSystem.sendMessage('room_1', 'global', 'sender_1', 'Sender 1', 'Hello');

      safetyService.blockUser('sender_1', 'viewer');

      const messages = chatSystem.getMessagesForEntity('room_1', 'viewer');

      expect(messages).toHaveLength(0);
    });

    it('returns all messages when no blocks exist', () => {
      chatSystem.sendMessage('room_1', 'global', 'sender_1', 'Sender 1', 'Hello');
      chatSystem.sendMessage('room_1', 'global', 'sender_2', 'Sender 2', 'Hi');

      const messages = chatSystem.getMessagesForEntity('room_1', 'viewer');

      expect(messages).toHaveLength(2);
    });

    it('works without SafetyService', () => {
      const standaloneChat = new ChatSystem();
      standaloneChat.sendMessage('room_1', 'global', 'sender_1', 'Sender 1', 'Hello');

      const messages = standaloneChat.getMessagesForEntity('room_1', 'viewer');

      expect(messages).toHaveLength(1);
    });
  });

  describe('isBlocked', () => {
    it('returns true when users are blocked', () => {
      safetyService.blockUser('user_a', 'user_b');

      expect(chatSystem.isBlocked('user_a', 'user_b')).toBe(true);
      expect(chatSystem.isBlocked('user_b', 'user_a')).toBe(true);
    });

    it('returns false when users are not blocked', () => {
      expect(chatSystem.isBlocked('user_a', 'user_b')).toBe(false);
    });

    it('returns false when no SafetyService is set', () => {
      const standaloneChat = new ChatSystem();
      expect(standaloneChat.isBlocked('user_a', 'user_b')).toBe(false);
    });
  });
});
