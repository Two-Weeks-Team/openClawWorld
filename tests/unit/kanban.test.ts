import { describe, it, expect, beforeEach } from 'vitest';
import { KanbanService } from '../../packages/server/src/services/KanbanService.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';

describe('KanbanService', () => {
  let service: KanbanService;
  let state: RoomState;

  beforeEach(() => {
    state = new RoomState('test-room', 'test-map');
    service = new KanbanService(state);
  });

  describe('Board Operations', () => {
    it('should create a board', () => {
      const board = service.createBoard('org-1', 'Project Board');
      expect(board).toBeDefined();
      expect(board.orgId).toBe('org-1');
      expect(board.name).toBe('Project Board');
      expect(board.id).toBeTruthy();
    });

    it('should store board in RoomState', () => {
      const board = service.createBoard('org-1', 'Test Board');
      expect(state.boards.get(board.id)).toBeDefined();
    });

    it('should delete a board', () => {
      const board = service.createBoard('org-1', 'To Delete');
      expect(service.deleteBoard(board.id)).toBe(true);
      expect(state.boards.get(board.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent board', () => {
      expect(service.deleteBoard('non-existent')).toBe(false);
    });

    it('should get board by id', () => {
      const board = service.createBoard('org-1', 'Get Test');
      const retrieved = service.getBoard(board.id);
      expect(retrieved?.id).toBe(board.id);
    });

    it('should get boards by org', () => {
      service.createBoard('org-1', 'Board 1');
      service.createBoard('org-1', 'Board 2');
      service.createBoard('org-2', 'Board 3');

      const org1Boards = service.getBoardsByOrg('org-1');
      expect(org1Boards.length).toBe(2);

      const org2Boards = service.getBoardsByOrg('org-2');
      expect(org2Boards.length).toBe(1);
    });
  });

  describe('Column Operations', () => {
    it('should add a column to board', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');

      expect(column).toBeDefined();
      expect(column?.name).toBe('To Do');
      expect(column?.order).toBe(0);
    });

    it('should add multiple columns with correct order', () => {
      const board = service.createBoard('org-1', 'Test');
      const col1 = service.addColumn(board.id, 'To Do');
      const col2 = service.addColumn(board.id, 'In Progress');
      const col3 = service.addColumn(board.id, 'Done');

      expect(col1?.order).toBe(0);
      expect(col2?.order).toBe(1);
      expect(col3?.order).toBe(2);
    });

    it('should return undefined when adding column to non-existent board', () => {
      expect(service.addColumn('non-existent', 'Test')).toBeUndefined();
    });

    it('should remove a column', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Delete');

      expect(service.removeColumn(board.id, column!.id)).toBe(true);
      expect(state.boards.get(board.id)?.columns.get(column!.id)).toBeUndefined();
    });

    it('should reorder remaining columns after removal', () => {
      const board = service.createBoard('org-1', 'Test');
      const col1 = service.addColumn(board.id, 'First');
      const col2 = service.addColumn(board.id, 'Second');
      const col3 = service.addColumn(board.id, 'Third');

      service.removeColumn(board.id, col2!.id);

      const boardSchema = state.boards.get(board.id);
      expect(boardSchema?.columns.get(col1!.id)?.order).toBe(0);
      expect(boardSchema?.columns.get(col3!.id)?.order).toBe(1);
    });

    it('should reorder columns', () => {
      const board = service.createBoard('org-1', 'Test');
      const col1 = service.addColumn(board.id, 'First');
      const col2 = service.addColumn(board.id, 'Second');
      const col3 = service.addColumn(board.id, 'Third');

      service.reorderColumns(board.id, [col3!.id, col1!.id, col2!.id]);

      const boardSchema = state.boards.get(board.id);
      expect(boardSchema?.columns.get(col3!.id)?.order).toBe(0);
      expect(boardSchema?.columns.get(col1!.id)?.order).toBe(1);
      expect(boardSchema?.columns.get(col2!.id)?.order).toBe(2);
    });
  });

  describe('Card Operations', () => {
    it('should create a card', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');
      const card = service.createCard(board.id, column!.id, 'Task 1', 'Description', 'user-1');

      expect(card).toBeDefined();
      expect(card?.title).toBe('Task 1');
      expect(card?.description).toBe('Description');
      expect(card?.createdBy).toBe('user-1');
      expect(card?.columnId).toBe(column!.id);
    });

    it('should return undefined when creating card in non-existent board', () => {
      expect(service.createCard('non-existent', 'col', 'Task', 'Desc', 'user')).toBeUndefined();
    });

    it('should return undefined when creating card in non-existent column', () => {
      const board = service.createBoard('org-1', 'Test');
      expect(service.createCard(board.id, 'non-existent', 'Task', 'Desc', 'user')).toBeUndefined();
    });

    it('should update a card', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');
      const card = service.createCard(board.id, column!.id, 'Task 1', 'Desc', 'user-1');

      const updated = service.updateCard(board.id, card!.id, {
        title: 'Updated Task',
        description: 'Updated Description',
      });

      expect(updated?.title).toBe('Updated Task');
      expect(updated?.description).toBe('Updated Description');
    });

    it('should delete a card', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');
      const card = service.createCard(board.id, column!.id, 'Task 1', 'Desc', 'user-1');

      expect(service.deleteCard(board.id, card!.id)).toBe(true);

      const columnSchema = state.boards.get(board.id)?.columns.get(column!.id);
      expect(columnSchema?.cards.get(card!.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent card', () => {
      const board = service.createBoard('org-1', 'Test');
      service.addColumn(board.id, 'To Do');
      expect(service.deleteCard(board.id, 'non-existent')).toBe(false);
    });

    it('should move card between columns', () => {
      const board = service.createBoard('org-1', 'Test');
      const col1 = service.addColumn(board.id, 'To Do');
      const col2 = service.addColumn(board.id, 'Done');
      const card = service.createCard(board.id, col1!.id, 'Task', 'Desc', 'user');

      service.moveCard(board.id, card!.id, col2!.id, 0);

      const col1Schema = state.boards.get(board.id)?.columns.get(col1!.id);
      const col2Schema = state.boards.get(board.id)?.columns.get(col2!.id);

      expect(col1Schema?.cards.get(card!.id)).toBeUndefined();
      expect(col2Schema?.cards.get(card!.id)).toBeDefined();
    });

    it('should maintain card order when moving', () => {
      const board = service.createBoard('org-1', 'Test');
      const col1 = service.addColumn(board.id, 'Source');
      const col2 = service.addColumn(board.id, 'Target');

      service.createCard(board.id, col2!.id, 'Existing 1', '', 'user');
      service.createCard(board.id, col2!.id, 'Existing 2', '', 'user');
      const cardToMove = service.createCard(board.id, col1!.id, 'Moving', '', 'user');

      service.moveCard(board.id, cardToMove!.id, col2!.id, 1);

      const col2Schema = state.boards.get(board.id)?.columns.get(col2!.id);
      expect(col2Schema?.cards.get(cardToMove!.id)?.order).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty board', () => {
      const board = service.createBoard('org-1', 'Empty');
      expect(state.boards.get(board.id)?.columns.size).toBe(0);
    });

    it('should handle column with no cards', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'Empty Column');
      expect(state.boards.get(board.id)?.columns.get(column!.id)?.cards.size).toBe(0);
    });

    it('should handle multiple cards in same column', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');

      service.createCard(board.id, column!.id, 'Task 1', '', 'user');
      service.createCard(board.id, column!.id, 'Task 2', '', 'user');
      service.createCard(board.id, column!.id, 'Task 3', '', 'user');

      const columnSchema = state.boards.get(board.id)?.columns.get(column!.id);
      expect(columnSchema?.cards.size).toBe(3);
    });

    it('should handle card order correctly when deleting middle card', () => {
      const board = service.createBoard('org-1', 'Test');
      const column = service.addColumn(board.id, 'To Do');

      const card1 = service.createCard(board.id, column!.id, 'Task 1', '', 'user');
      const card2 = service.createCard(board.id, column!.id, 'Task 2', '', 'user');
      const card3 = service.createCard(board.id, column!.id, 'Task 3', '', 'user');

      service.deleteCard(board.id, card2!.id);

      const columnSchema = state.boards.get(board.id)?.columns.get(column!.id);
      expect(columnSchema?.cards.get(card1!.id)?.order).toBe(0);
      expect(columnSchema?.cards.get(card3!.id)?.order).toBe(1);
    });
  });
});
