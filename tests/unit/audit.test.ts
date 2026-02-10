import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLog, type AuditEntry } from '../../packages/server/src/audit/AuditLog';

describe('AuditLog', () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog();
  });

  describe('log', () => {
    it('should add entry with timestamp', () => {
      auditLog.log('safety.report', 'actor1', { targetId: 'target1', reason: 'spam' });
      const entries = auditLog.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('safety.report');
      expect(entries[0].actorId).toBe('actor1');
      expect(entries[0].timestamp).toBeDefined();
      expect(typeof entries[0].timestamp).toBe('number');
    });

    it('should generate unique IDs for each entry', () => {
      auditLog.log('safety.report', 'actor1');
      auditLog.log('safety.report', 'actor2');
      const entries = auditLog.getEntries();
      expect(entries[0].id).not.toBe(entries[1].id);
    });

    it('should store targetId and roomId at top level', () => {
      auditLog.log('safety.block', 'actor1', {
        targetId: 'target2',
        roomId: 'room1',
        reason: 'harassment',
      });
      const entries = auditLog.getEntries();
      expect(entries[0].targetId).toBe('target2');
      expect(entries[0].roomId).toBe('room1');
      expect(entries[0].metadata.reason).toBe('harassment');
      expect(entries[0].metadata.targetId).toBeUndefined();
      expect(entries[0].metadata.roomId).toBeUndefined();
    });

    it('should handle entries without optional fields', () => {
      auditLog.log('org.create', 'admin1', { orgName: 'Test Org' });
      const entries = auditLog.getEntries();
      expect(entries[0].targetId).toBeUndefined();
      expect(entries[0].roomId).toBeUndefined();
      expect(entries[0].metadata.orgName).toBe('Test Org');
    });
  });

  describe('getEntries', () => {
    beforeEach(() => {
      auditLog.log('safety.report', 'actor1', { targetId: 'target1' });
      auditLog.log('safety.block', 'actor2', { targetId: 'target1' });
      auditLog.log('safety.report', 'actor1', { targetId: 'target2' });
      auditLog.log('safety.unblock', 'actor2', { targetId: 'target3' });
    });

    it('should return all entries when no filter provided', () => {
      const entries = auditLog.getEntries();
      expect(entries).toHaveLength(4);
    });

    it('should filter by type', () => {
      const reports = auditLog.getEntries({ type: 'safety.report' });
      expect(reports).toHaveLength(2);
      expect(reports.every((e: AuditEntry) => e.type === 'safety.report')).toBe(true);
    });

    it('should filter by actorId', () => {
      const entries = auditLog.getEntries({ actorId: 'actor1' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e: AuditEntry) => e.actorId === 'actor1')).toBe(true);
    });

    it('should filter by targetId', () => {
      const entries = auditLog.getEntries({ targetId: 'target1' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e: AuditEntry) => e.targetId === 'target1')).toBe(true);
    });

    it('should filter by since timestamp', () => {
      const now = Date.now();
      auditLog.log('safety.mute', 'actor3', { targetId: 'target4' });
      const entries = auditLog.getEntries({ since: now - 1000 });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[entries.length - 1].type).toBe('safety.mute');
    });

    it('should limit results', () => {
      const entries = auditLog.getEntries({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should apply combined filters', () => {
      const entries = auditLog.getEntries({ type: 'safety.report', actorId: 'actor1' });
      expect(entries).toHaveLength(2);
      expect(
        entries.every((e: AuditEntry) => e.type === 'safety.report' && e.actorId === 'actor1')
      ).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should save and restore state', () => {
      auditLog.log('safety.block', 'actor1', { targetId: 'target1', roomId: 'room1' });
      const state = auditLog.getState();

      const newLog = new AuditLog();
      newLog.loadState(state);

      expect(newLog.getEntries()).toHaveLength(1);
      const entry = newLog.getEntries()[0];
      expect(entry.type).toBe('safety.block');
      expect(entry.actorId).toBe('actor1');
      expect(entry.targetId).toBe('target1');
      expect(entry.roomId).toBe('room1');
    });

    it('should return copy of entries in getState', () => {
      auditLog.log('safety.report', 'actor1');
      const state = auditLog.getState();
      state[0].actorId = 'modified';
      const entries = auditLog.getEntries();
      expect(entries[0].actorId).toBe('actor1');
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      auditLog.log('safety.report', 'actor1');
      auditLog.log('safety.block', 'actor2');
      expect(auditLog.getEntries()).toHaveLength(2);

      auditLog.clear();
      expect(auditLog.getEntries()).toHaveLength(0);
    });
  });

  describe('max entries', () => {
    it('should return default max entries', () => {
      expect(auditLog.getMaxEntries()).toBe(10000);
    });

    it('should allow setting max entries', () => {
      auditLog.setMaxEntries(100);
      expect(auditLog.getMaxEntries()).toBe(100);
    });

    it('should trim entries when reducing max', () => {
      for (let i = 0; i < 10; i++) {
        auditLog.log('safety.report', `actor${i}`);
      }
      expect(auditLog.getEntries()).toHaveLength(10);

      auditLog.setMaxEntries(5);
      expect(auditLog.getEntries()).toHaveLength(5);
    });

    it('should maintain ring buffer behavior when max reached', () => {
      auditLog.setMaxEntries(20);

      for (let i = 0; i < 25; i++) {
        auditLog.log('safety.report', `actor${i}`);
      }

      const entries = auditLog.getEntries();
      expect(entries.length).toBeLessThanOrEqual(20);
      expect(entries[entries.length - 1].actorId).toBe('actor24');
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata', () => {
      auditLog.log('org.create', 'admin1');
      const entries = auditLog.getEntries();
      expect(entries[0].metadata).toEqual({});
    });

    it('should return empty array for non-matching filters', () => {
      auditLog.log('safety.report', 'actor1');
      const entries = auditLog.getEntries({ type: 'safety.block' });
      expect(entries).toHaveLength(0);
    });

    it('should handle future since timestamp', () => {
      auditLog.log('safety.report', 'actor1');
      const future = Date.now() + 10000;
      const entries = auditLog.getEntries({ since: future });
      expect(entries).toHaveLength(0);
    });

    it('should return entries in chronological order', () => {
      auditLog.log('safety.report', 'actor1');
      auditLog.log('safety.block', 'actor2');
      auditLog.log('safety.mute', 'actor3');

      const entries = auditLog.getEntries();
      expect(entries[0].type).toBe('safety.report');
      expect(entries[1].type).toBe('safety.block');
      expect(entries[2].type).toBe('safety.mute');
      expect(entries[0].timestamp).toBeLessThanOrEqual(entries[1].timestamp);
      expect(entries[1].timestamp).toBeLessThanOrEqual(entries[2].timestamp);
    });
  });
});
