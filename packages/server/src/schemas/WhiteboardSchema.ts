import { Schema, MapSchema, type } from '@colyseus/schema';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export const VALID_COLORS: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];

export interface StickyNoteData {
  id?: string;
  x?: number;
  y?: number;
  text?: string;
  color?: StickyNoteColor;
  authorId?: string;
  createdAt?: number;
}

export class StickyNoteSchema extends Schema {
  @type('string') id: string = '';
  @type('number') x: number = 0; // Grid position 0-9
  @type('number') y: number = 0; // Grid position 0-9
  @type('string') text: string = ''; // Max 200 chars
  @type('string') color: string = 'yellow'; // yellow|pink|blue|green
  @type('string') authorId: string = '';
  @type('number') createdAt: number = 0;

  constructor(data?: StickyNoteData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.x !== undefined) this.x = data.x;
      if (data.y !== undefined) this.y = data.y;
      if (data.text !== undefined) this.text = data.text;
      if (data.color !== undefined) this.color = data.color;
      if (data.authorId !== undefined) this.authorId = data.authorId;
      if (data.createdAt !== undefined) this.createdAt = data.createdAt;
    }
  }
}

export interface WhiteboardData {
  id?: string;
  meetingId?: string;
  gridWidth?: number;
  gridHeight?: number;
}

export class WhiteboardSchema extends Schema {
  @type('string') id: string = '';
  @type('string') meetingId: string = '';
  @type({ map: StickyNoteSchema }) notes = new MapSchema<StickyNoteSchema>();
  @type('number') gridWidth: number = 10;
  @type('number') gridHeight: number = 10;

  constructor(data?: WhiteboardData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.meetingId !== undefined) this.meetingId = data.meetingId;
      if (data.gridWidth !== undefined) this.gridWidth = data.gridWidth;
      if (data.gridHeight !== undefined) this.gridHeight = data.gridHeight;
    }
  }

  addNote(data: StickyNoteData): string {
    const id = data.id ?? this.generateNoteId();
    const note = new StickyNoteSchema({ ...data, id });
    this.notes.set(id, note);
    return id;
  }

  removeNote(noteId: string): boolean {
    if (!this.notes.has(noteId)) {
      return false;
    }
    this.notes.delete(noteId);
    return true;
  }

  getNote(noteId: string): StickyNoteSchema | undefined {
    return this.notes.get(noteId);
  }

  hasNote(noteId: string): boolean {
    return this.notes.has(noteId);
  }

  getNoteCount(): number {
    return this.notes.size;
  }

  clear(): void {
    this.notes.clear();
  }

  getAllNotes(): StickyNoteSchema[] {
    const notes: StickyNoteSchema[] = [];
    this.notes.forEach(note => notes.push(note));
    return notes;
  }

  private generateNoteId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
