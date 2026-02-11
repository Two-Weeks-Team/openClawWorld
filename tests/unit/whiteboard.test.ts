import { describe, it, expect, beforeEach } from 'vitest';
import { WhiteboardService } from '../../packages/server/src/services/WhiteboardService.js';

describe('WhiteboardService', () => {
  let service: WhiteboardService;

  beforeEach(() => {
    service = new WhiteboardService();
  });

  describe('Whiteboard CRUD', () => {
    it('should create a whiteboard', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(whiteboard).toBeDefined();
      expect(whiteboard.meetingId).toBe('meeting-1');
      expect(whiteboard.gridWidth).toBe(10);
      expect(whiteboard.gridHeight).toBe(10);
    });

    it('should get whiteboard by id', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const retrieved = service.getWhiteboard(whiteboard.id);
      expect(retrieved?.id).toBe(whiteboard.id);
    });

    it('should return undefined for non-existent whiteboard', () => {
      expect(service.getWhiteboard('non-existent')).toBeUndefined();
    });

    it('should delete a whiteboard', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.deleteWhiteboard(whiteboard.id)).toBe(true);
      expect(service.getWhiteboard(whiteboard.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent whiteboard', () => {
      expect(service.deleteWhiteboard('non-existent')).toBe(false);
    });

    it('should get whiteboard by meeting id', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const retrieved = service.getWhiteboardByMeetingId('meeting-1');
      expect(retrieved?.id).toBe(whiteboard.id);
    });

    it('should get all whiteboards', () => {
      service.createWhiteboard('meeting-1');
      service.createWhiteboard('meeting-2');
      service.createWhiteboard('meeting-3');

      const all = service.getAllWhiteboards();
      expect(all.length).toBe(3);
    });
  });

  describe('Sticky Note CRUD', () => {
    it('should add a note to whiteboard', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 5, 5, 'Test note', 'yellow', 'user-1');

      expect(note).not.toBeNull();
      expect(note?.x).toBe(5);
      expect(note?.y).toBe(5);
      expect(note?.text).toBe('Test note');
      expect(note?.color).toBe('yellow');
      expect(note?.authorId).toBe('user-1');
    });

    it('should return null when adding note to non-existent whiteboard', () => {
      expect(service.addNote('non-existent', 0, 0, 'Test', 'yellow', 'user')).toBeNull();
    });

    it('should update a note', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Original', 'yellow', 'user');

      const updated = service.updateNote(whiteboard.id, note!.id, {
        text: 'Updated',
        color: 'pink',
      });

      expect(updated?.text).toBe('Updated');
      expect(updated?.color).toBe('pink');
    });

    it('should move a note', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');

      const moved = service.moveNote(whiteboard.id, note!.id, 5, 7);

      expect(moved?.x).toBe(5);
      expect(moved?.y).toBe(7);
    });

    it('should delete a note', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');

      expect(service.deleteNote(whiteboard.id, note!.id)).toBe(true);
      expect(service.getWhiteboard(whiteboard.id)?.notes.get(note!.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent note', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.deleteNote(whiteboard.id, 'non-existent')).toBe(false);
    });

    it('should clear all notes', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      service.addNote(whiteboard.id, 0, 0, 'Note 1', 'yellow', 'user');
      service.addNote(whiteboard.id, 1, 1, 'Note 2', 'pink', 'user');
      service.addNote(whiteboard.id, 2, 2, 'Note 3', 'blue', 'user');

      expect(service.clearWhiteboard(whiteboard.id)).toBe(true);
      expect(service.getWhiteboard(whiteboard.id)?.notes.size).toBe(0);
    });
  });

  describe('Grid Boundary Validation', () => {
    it('should reject note with negative x', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.addNote(whiteboard.id, -1, 0, 'Test', 'yellow', 'user')).toBeNull();
    });

    it('should reject note with negative y', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.addNote(whiteboard.id, 0, -1, 'Test', 'yellow', 'user')).toBeNull();
    });

    it('should reject note with x >= gridWidth', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.addNote(whiteboard.id, 10, 0, 'Test', 'yellow', 'user')).toBeNull();
    });

    it('should reject note with y >= gridHeight', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.addNote(whiteboard.id, 0, 10, 'Test', 'yellow', 'user')).toBeNull();
    });

    it('should accept note at max valid position (9,9)', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 9, 9, 'Test', 'yellow', 'user');
      expect(note).not.toBeNull();
    });

    it('should reject move to invalid position', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');
      expect(service.moveNote(whiteboard.id, note!.id, 10, 10)).toBeNull();
    });
  });

  describe('Color Validation', () => {
    it('should accept yellow color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');
      expect(note?.color).toBe('yellow');
    });

    it('should accept pink color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'pink', 'user');
      expect(note?.color).toBe('pink');
    });

    it('should accept blue color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'blue', 'user');
      expect(note?.color).toBe('blue');
    });

    it('should accept green color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'green', 'user');
      expect(note?.color).toBe('green');
    });

    it('should reject invalid color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      expect(service.addNote(whiteboard.id, 0, 0, 'Test', 'red', 'user')).toBeNull();
    });

    it('should reject color update to invalid color', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');
      expect(service.updateNote(whiteboard.id, note!.id, { color: 'red' as 'yellow' })).toBeNull();
    });
  });

  describe('Text Length Validation', () => {
    it('should accept text up to 200 characters', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const longText = 'a'.repeat(200);
      const note = service.addNote(whiteboard.id, 0, 0, longText, 'yellow', 'user');
      expect(note?.text).toBe(longText);
    });

    it('should reject text over 200 characters', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const tooLongText = 'a'.repeat(201);
      expect(service.addNote(whiteboard.id, 0, 0, tooLongText, 'yellow', 'user')).toBeNull();
    });

    it('should accept empty text', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, '', 'yellow', 'user');
      expect(note?.text).toBe('');
    });

    it('should reject text update over 200 characters', () => {
      const whiteboard = service.createWhiteboard('meeting-1');
      const note = service.addNote(whiteboard.id, 0, 0, 'Test', 'yellow', 'user');
      const tooLongText = 'a'.repeat(201);
      expect(service.updateNote(whiteboard.id, note!.id, { text: tooLongText })).toBeNull();
    });
  });
});
