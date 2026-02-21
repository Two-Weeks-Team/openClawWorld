//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { StickyNoteSchema } from './StickyNoteSchema';

export class WhiteboardSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public meetingId!: string;
  @type({ map: StickyNoteSchema }) public notes: MapSchema<StickyNoteSchema> =
    new MapSchema<StickyNoteSchema>();
  @type('number') public gridWidth!: number;
  @type('number') public gridHeight!: number;
}
