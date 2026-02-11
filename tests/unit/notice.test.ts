import { describe, it, expect, beforeEach } from 'vitest';
import { NoticeService } from '../../packages/server/src/services/NoticeService.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';

describe('NoticeService', () => {
  let state: RoomState;
  let noticeService: NoticeService;
  const teamId = 'team_001';
  const authorId = 'entity_001';

  beforeEach(() => {
    state = new RoomState('default', 'lobby');
    noticeService = new NoticeService(state);
  });

  describe('createNotice', () => {
    it('creates a notice with required fields', () => {
      const notice = noticeService.createNotice(teamId, 'Test Title', 'Test Content', authorId);

      expect(notice.title).toBe('Test Title');
      expect(notice.content).toBe('Test Content');
      expect(notice.teamId).toBe(teamId);
      expect(notice.authorId).toBe(authorId);
      expect(notice.pinned).toBe(false);
      expect(notice.id).toBeDefined();
      expect(notice.createdAt).toBeGreaterThan(0);
    });

    it('generates unique IDs for each notice', () => {
      const notice1 = noticeService.createNotice(teamId, 'Title 1', 'Content 1', authorId);
      const notice2 = noticeService.createNotice(teamId, 'Title 2', 'Content 2', authorId);

      expect(notice1.id).not.toBe(notice2.id);
    });

    it('adds notice to RoomState', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      const schema = state.notices.get(notice.id);
      expect(schema).toBeDefined();
      expect(schema?.title).toBe('Test');
    });
  });

  describe('updateNotice', () => {
    it('updates notice fields', () => {
      const notice = noticeService.createNotice(teamId, 'Original', 'Content', authorId);

      const updated = noticeService.updateNotice(notice.id, {
        title: 'Updated Title',
        content: 'Updated Content',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.content).toBe('Updated Content');
    });

    it('returns null for non-existent notice', () => {
      const updated = noticeService.updateNotice('non-existent', { title: 'New' });
      expect(updated).toBeNull();
    });

    it('updates notice in RoomState', () => {
      const notice = noticeService.createNotice(teamId, 'Original', 'Content', authorId);

      noticeService.updateNotice(notice.id, { title: 'Updated' });

      const schema = state.notices.get(notice.id);
      expect(schema?.title).toBe('Updated');
    });
  });

  describe('deleteNotice', () => {
    it('deletes an existing notice', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      const result = noticeService.deleteNotice(notice.id);

      expect(result).toBe(true);
      expect(noticeService.getNotice(notice.id)).toBeNull();
    });

    it('returns false for non-existent notice', () => {
      const result = noticeService.deleteNotice('non-existent');
      expect(result).toBe(false);
    });

    it('removes notice from RoomState', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      noticeService.deleteNotice(notice.id);

      expect(state.notices.has(notice.id)).toBe(false);
    });
  });

  describe('pinNotice', () => {
    it('pins a notice', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      const result = noticeService.pinNotice(notice.id, true);

      expect(result).toBe(true);
      expect(noticeService.getNotice(notice.id)?.pinned).toBe(true);
    });

    it('unpins a notice', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);
      noticeService.pinNotice(notice.id, true);

      const result = noticeService.pinNotice(notice.id, false);

      expect(result).toBe(true);
      expect(noticeService.getNotice(notice.id)?.pinned).toBe(false);
    });

    it('returns false for non-existent notice', () => {
      const result = noticeService.pinNotice('non-existent', true);
      expect(result).toBe(false);
    });

    it('updates pin status in RoomState', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      noticeService.pinNotice(notice.id, true);

      const schema = state.notices.get(notice.id);
      expect(schema?.pinned).toBe(true);
    });
  });

  describe('getNotices', () => {
    it('returns empty array for team with no notices', () => {
      const notices = noticeService.getNotices('non-existent-team');
      expect(notices).toEqual([]);
    });

    it('returns all notices for a team', () => {
      noticeService.createNotice(teamId, 'Notice 1', 'Content 1', authorId);
      noticeService.createNotice(teamId, 'Notice 2', 'Content 2', authorId);

      const notices = noticeService.getNotices(teamId);

      expect(notices).toHaveLength(2);
    });

    it('filters notices by teamId', () => {
      const team2Id = 'team_002';
      noticeService.createNotice(teamId, 'Team 1 Notice', 'Content', authorId);
      noticeService.createNotice(team2Id, 'Team 2 Notice', 'Content', authorId);

      const notices = noticeService.getNotices(teamId);

      expect(notices).toHaveLength(1);
      expect(notices[0].title).toBe('Team 1 Notice');
    });

    it('sorts pinned notices first', () => {
      const notice1 = noticeService.createNotice(teamId, 'Regular', 'Content', authorId);
      const notice2 = noticeService.createNotice(teamId, 'Pinned', 'Content', authorId);
      noticeService.pinNotice(notice2.id, true);

      const notices = noticeService.getNotices(teamId);

      expect(notices[0].id).toBe(notice2.id);
      expect(notices[1].id).toBe(notice1.id);
    });

    it('sorts by createdAt (newest first) within same pin status', async () => {
      const notice1 = noticeService.createNotice(teamId, 'Older', 'Content', authorId);
      await new Promise(resolve => setTimeout(resolve, 10));
      const notice2 = noticeService.createNotice(teamId, 'Newer', 'Content', authorId);

      const notices = noticeService.getNotices(teamId);

      expect(notices[0].id).toBe(notice2.id);
      expect(notices[1].id).toBe(notice1.id);
    });
  });

  describe('getNotice', () => {
    it('returns notice by ID', () => {
      const created = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      const found = noticeService.getNotice(created.id);

      expect(found).not.toBeNull();
      expect(found?.title).toBe('Test');
    });

    it('returns null for non-existent notice', () => {
      const found = noticeService.getNotice('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getState', () => {
    it('returns all notices by team', () => {
      noticeService.createNotice(teamId, 'Notice 1', 'Content', authorId);
      noticeService.createNotice(teamId, 'Notice 2', 'Content', authorId);

      const state = noticeService.getState();

      expect(state.notices[teamId]).toHaveLength(2);
    });

    it('preserves notice data', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);

      const state = noticeService.getState();

      expect(state.notices[teamId][0].id).toBe(notice.id);
      expect(state.notices[teamId][0].title).toBe('Test');
      expect(state.notices[teamId][0].pinned).toBe(false);
    });
  });

  describe('loadState', () => {
    it('restores notices from state', () => {
      noticeService.createNotice(teamId, 'Test', 'Content', authorId);
      const state = noticeService.getState();

      const newState = new RoomState('default', 'lobby');
      const newService = new NoticeService(newState);
      newService.loadState(state);

      const notices = newService.getNotices(teamId);
      expect(notices).toHaveLength(1);
      expect(notices[0].title).toBe('Test');
    });

    it('restores notices to RoomState', () => {
      const original = noticeService.createNotice(teamId, 'Test', 'Content', authorId);
      const state = noticeService.getState();

      const newState = new RoomState('default', 'lobby');
      const newService = new NoticeService(newState);
      newService.loadState(state);

      expect(newState.notices.has(original.id)).toBe(true);
    });

    it('preserves pin status after load', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);
      noticeService.pinNotice(notice.id, true);
      const state = noticeService.getState();

      const newState = new RoomState('default', 'lobby');
      const newService = new NoticeService(newState);
      newService.loadState(state);

      const restored = newService.getNotice(notice.id);
      expect(restored?.pinned).toBe(true);
    });

    it('preserves timestamps after load', () => {
      const notice = noticeService.createNotice(teamId, 'Test', 'Content', authorId);
      const state = noticeService.getState();

      const newState = new RoomState('default', 'lobby');
      const newService = new NoticeService(newState);
      newService.loadState(state);

      const restored = newService.getNotice(notice.id);
      expect(restored?.createdAt).toBe(notice.createdAt);
    });

    it('clears existing notices before loading', () => {
      noticeService.createNotice(teamId, 'Old', 'Content', authorId);
      const newState = { notices: {} };

      noticeService.loadState(newState);

      expect(noticeService.getNotices(teamId)).toHaveLength(0);
    });
  });
});
