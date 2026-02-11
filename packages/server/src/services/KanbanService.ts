import { randomUUID } from 'crypto';
import {
  KanbanBoardSchema,
  KanbanColumnSchema,
  KanbanCardSchema,
} from '../schemas/KanbanSchema.js';
import { RoomState } from '../schemas/RoomState.js';

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  createdBy: string;
  createdAt: number;
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  orgId: string;
  name: string;
  columns: KanbanColumn[];
}

export class KanbanService {
  private boards: Map<string, KanbanBoard> = new Map();

  constructor(private state: RoomState) {}

  createBoard(orgId: string, name: string): KanbanBoardSchema {
    const id = randomUUID();
    const board: KanbanBoard = {
      id,
      orgId,
      name,
      columns: [],
    };

    this.boards.set(id, board);

    const boardSchema = new KanbanBoardSchema(id, orgId, name);
    this.state.boards.set(id, boardSchema);

    return boardSchema;
  }

  deleteBoard(boardId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) {
      return false;
    }

    this.boards.delete(boardId);
    this.state.boards.delete(boardId);

    return true;
  }

  addColumn(boardId: string, name: string): KanbanColumnSchema | undefined {
    const board = this.boards.get(boardId);
    if (!board) {
      return undefined;
    }

    const id = randomUUID();
    const order = board.columns.length;
    const column: KanbanColumn = {
      id,
      name,
      order,
      cards: [],
    };

    board.columns.push(column);

    const columnSchema = new KanbanColumnSchema(id, name, order);
    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      boardSchema.columns.set(id, columnSchema);
    }

    return columnSchema;
  }

  removeColumn(boardId: string, columnId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) {
      return false;
    }

    const columnIndex = board.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) {
      return false;
    }

    board.columns.splice(columnIndex, 1);
    board.columns.forEach((col, index) => {
      col.order = index;
    });

    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      boardSchema.columns.delete(columnId);
      board.columns.forEach(col => {
        const colSchema = boardSchema.columns.get(col.id);
        if (colSchema) {
          colSchema.order = col.order;
        }
      });
    }

    return true;
  }

  reorderColumns(boardId: string, columnIds: string[]): void {
    const board = this.boards.get(boardId);
    if (!board) {
      return;
    }

    const reorderedColumns: KanbanColumn[] = [];
    for (const columnId of columnIds) {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        reorderedColumns.push(column);
      }
    }

    for (const column of board.columns) {
      if (!columnIds.includes(column.id)) {
        reorderedColumns.push(column);
      }
    }

    board.columns = reorderedColumns;
    board.columns.forEach((col, index) => {
      col.order = index;
    });

    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      board.columns.forEach(col => {
        const colSchema = boardSchema.columns.get(col.id);
        if (colSchema) {
          colSchema.order = col.order;
        }
      });
    }
  }

  createCard(
    boardId: string,
    columnId: string,
    title: string,
    description: string,
    createdBy: string
  ): KanbanCardSchema | undefined {
    const board = this.boards.get(boardId);
    if (!board) {
      return undefined;
    }

    const column = board.columns.find(c => c.id === columnId);
    if (!column) {
      return undefined;
    }

    const id = randomUUID();
    const order = column.cards.length;
    const card: KanbanCard = {
      id,
      title,
      description,
      columnId,
      order,
      createdBy,
      createdAt: Date.now(),
    };

    column.cards.push(card);

    const cardSchema = new KanbanCardSchema(id, title, description, columnId, order, createdBy);
    cardSchema.createdAt = card.createdAt;

    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      const columnSchema = boardSchema.columns.get(columnId);
      if (columnSchema) {
        columnSchema.cards.set(id, cardSchema);
      }
    }

    return cardSchema;
  }

  updateCard(
    boardId: string,
    cardId: string,
    updates: Partial<Omit<KanbanCard, 'id' | 'columnId' | 'createdBy' | 'createdAt'>>
  ): KanbanCardSchema | undefined {
    const board = this.boards.get(boardId);
    if (!board) {
      return undefined;
    }

    let card: KanbanCard | undefined;
    let column: KanbanColumn | undefined;

    for (const col of board.columns) {
      const foundCard = col.cards.find(c => c.id === cardId);
      if (foundCard) {
        card = foundCard;
        column = col;
        break;
      }
    }

    if (!card || !column) {
      return undefined;
    }

    if (updates.title !== undefined) {
      card.title = updates.title;
    }
    if (updates.description !== undefined) {
      card.description = updates.description;
    }
    if (updates.order !== undefined) {
      card.order = updates.order;
    }

    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      const columnSchema = boardSchema.columns.get(column.id);
      if (columnSchema) {
        const cardSchema = columnSchema.cards.get(cardId);
        if (cardSchema) {
          if (updates.title !== undefined) cardSchema.title = updates.title;
          if (updates.description !== undefined) cardSchema.description = updates.description;
          if (updates.order !== undefined) cardSchema.order = updates.order;
        }
      }
    }

    const boardSchemaResult = this.state.boards.get(boardId);
    if (boardSchemaResult) {
      for (const col of board.columns) {
        const colSchema = boardSchemaResult.columns.get(col.id);
        if (colSchema) {
          const cardSchema = colSchema.cards.get(cardId);
          if (cardSchema) {
            return cardSchema;
          }
        }
      }
    }

    return undefined;
  }

  deleteCard(boardId: string, cardId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) {
      return false;
    }

    for (const column of board.columns) {
      const cardIndex = column.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        column.cards.splice(cardIndex, 1);
        column.cards.forEach((c, index) => {
          c.order = index;
        });

        const boardSchema = this.state.boards.get(boardId);
        if (boardSchema) {
          const columnSchema = boardSchema.columns.get(column.id);
          if (columnSchema) {
            columnSchema.cards.delete(cardId);
            column.cards.forEach(c => {
              const cardSchema = columnSchema.cards.get(c.id);
              if (cardSchema) {
                cardSchema.order = c.order;
              }
            });
          }
        }

        return true;
      }
    }

    return false;
  }

  moveCard(boardId: string, cardId: string, targetColumnId: string, newOrder: number): void {
    const board = this.boards.get(boardId);
    if (!board) {
      return;
    }

    let card: KanbanCard | undefined;
    let sourceColumn: KanbanColumn | undefined;
    let sourceColumnIndex = -1;

    for (let i = 0; i < board.columns.length; i++) {
      const col = board.columns[i];
      const cardIndex = col.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        card = col.cards[cardIndex];
        sourceColumn = col;
        sourceColumnIndex = i;
        break;
      }
    }

    if (!card || !sourceColumn || sourceColumnIndex === -1) {
      return;
    }

    const targetColumn = board.columns.find(c => c.id === targetColumnId);
    if (!targetColumn) {
      return;
    }

    const cardIndexInSource = sourceColumn.cards.findIndex(c => c.id === cardId);
    if (cardIndexInSource !== -1) {
      sourceColumn.cards.splice(cardIndexInSource, 1);
    }

    sourceColumn.cards.forEach((c, index) => {
      c.order = index;
    });

    card.columnId = targetColumnId;
    const clampedOrder = Math.max(0, Math.min(newOrder, targetColumn.cards.length));
    targetColumn.cards.splice(clampedOrder, 0, card);

    targetColumn.cards.forEach((c, index) => {
      c.order = index;
    });

    const boardSchema = this.state.boards.get(boardId);
    if (boardSchema) {
      const sourceColumnSchema = boardSchema.columns.get(sourceColumn.id);
      if (sourceColumnSchema) {
        sourceColumnSchema.cards.delete(cardId);
        sourceColumn.cards.forEach(c => {
          const existingCardSchema = sourceColumnSchema.cards.get(c.id);
          if (existingCardSchema) {
            existingCardSchema.order = c.order;
          }
        });
      }

      const targetColumnSchema = boardSchema.columns.get(targetColumnId);
      if (targetColumnSchema) {
        const cardSchema = new KanbanCardSchema(
          card.id,
          card.title,
          card.description,
          targetColumnId,
          card.order,
          card.createdBy
        );
        cardSchema.createdAt = card.createdAt;
        targetColumnSchema.cards.set(cardId, cardSchema);

        targetColumn.cards.forEach(c => {
          const existingCardSchema = targetColumnSchema.cards.get(c.id);
          if (existingCardSchema) {
            existingCardSchema.order = c.order;
          }
        });
      }
    }
  }

  getBoard(boardId: string): KanbanBoardSchema | undefined {
    return this.state.boards.get(boardId);
  }

  getBoardsByOrg(orgId: string): KanbanBoardSchema[] {
    const boards: KanbanBoardSchema[] = [];
    this.state.boards.forEach(board => {
      if (board.orgId === orgId) {
        boards.push(board);
      }
    });
    return boards;
  }
}
