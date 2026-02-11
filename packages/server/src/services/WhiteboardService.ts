import { WhiteboardSchema, StickyNoteSchema, VALID_COLORS } from '../schemas/WhiteboardSchema.js';
import type { StickyNoteColor } from '../schemas/WhiteboardSchema.js';

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: StickyNoteColor;
  authorId: string;
  createdAt: number;
}

export interface Whiteboard {
  id: string;
  meetingId: string;
  notes: StickyNote[];
  gridWidth: number;
  gridHeight: number;
}

export class WhiteboardService {
  private whiteboards: Map<string, WhiteboardSchema> = new Map();
  private whiteboardCounter = 0;

  constructor() {}

  createWhiteboard(meetingId: string): WhiteboardSchema {
    const id = `whiteboard_${++this.whiteboardCounter}_${Date.now()}`;
    const whiteboard = new WhiteboardSchema({
      id,
      meetingId,
      gridWidth: 10,
      gridHeight: 10,
    });
    this.whiteboards.set(id, whiteboard);
    return whiteboard;
  }

  deleteWhiteboard(whiteboardId: string): boolean {
    return this.whiteboards.delete(whiteboardId);
  }

  addNote(
    whiteboardId: string,
    x: number,
    y: number,
    text: string,
    color: string,
    authorId: string
  ): StickyNoteSchema | null {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      return null;
    }

    if (!this.isValidPosition(x, y, whiteboard)) {
      return null;
    }

    if (!this.isValidColor(color)) {
      return null;
    }

    if (!this.isValidText(text)) {
      return null;
    }

    const noteId = whiteboard.addNote({
      x,
      y,
      text,
      color: color as StickyNoteColor,
      authorId,
      createdAt: Date.now(),
    });

    return whiteboard.getNote(noteId) ?? null;
  }

  updateNote(
    whiteboardId: string,
    noteId: string,
    updates: Partial<Omit<StickyNote, 'id' | 'createdAt' | 'authorId'>>
  ): StickyNoteSchema | null {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      return null;
    }

    const note = whiteboard.getNote(noteId);
    if (!note) {
      return null;
    }

    if (updates.x !== undefined || updates.y !== undefined) {
      const newX = updates.x ?? note.x;
      const newY = updates.y ?? note.y;
      if (!this.isValidPosition(newX, newY, whiteboard)) {
        return null;
      }
    }

    if (updates.color !== undefined && !this.isValidColor(updates.color)) {
      return null;
    }

    if (updates.text !== undefined && !this.isValidText(updates.text)) {
      return null;
    }

    if (updates.x !== undefined) note.x = updates.x;
    if (updates.y !== undefined) note.y = updates.y;
    if (updates.text !== undefined) note.text = updates.text;
    if (updates.color !== undefined) note.color = updates.color;

    return note;
  }

  moveNote(
    whiteboardId: string,
    noteId: string,
    newX: number,
    newY: number
  ): StickyNoteSchema | null {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      return null;
    }

    const note = whiteboard.getNote(noteId);
    if (!note) {
      return null;
    }

    if (!this.isValidPosition(newX, newY, whiteboard)) {
      return null;
    }

    note.x = newX;
    note.y = newY;

    return note;
  }

  deleteNote(whiteboardId: string, noteId: string): boolean {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      return false;
    }

    return whiteboard.removeNote(noteId);
  }

  getWhiteboard(whiteboardId: string): WhiteboardSchema | undefined {
    return this.whiteboards.get(whiteboardId);
  }

  clearWhiteboard(whiteboardId: string): boolean {
    const whiteboard = this.whiteboards.get(whiteboardId);
    if (!whiteboard) {
      return false;
    }

    whiteboard.clear();
    return true;
  }

  getWhiteboardByMeetingId(meetingId: string): WhiteboardSchema | undefined {
    for (const whiteboard of this.whiteboards.values()) {
      if (whiteboard.meetingId === meetingId) {
        return whiteboard;
      }
    }
    return undefined;
  }

  getAllWhiteboards(): WhiteboardSchema[] {
    return Array.from(this.whiteboards.values());
  }

  private isValidPosition(x: number, y: number, whiteboard: WhiteboardSchema): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < whiteboard.gridWidth &&
      y >= 0 &&
      y < whiteboard.gridHeight
    );
  }

  private isValidColor(color: string): color is StickyNoteColor {
    return VALID_COLORS.includes(color as StickyNoteColor);
  }

  private isValidText(text: string): boolean {
    return text.length <= 200;
  }
}
