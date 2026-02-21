//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.12
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { KanbanColumnSchema } from './KanbanColumnSchema';

export class KanbanBoardSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public orgId!: string;
  @type('string') public name!: string;
  @type({ map: KanbanColumnSchema }) public columns: MapSchema<KanbanColumnSchema> =
    new MapSchema<KanbanColumnSchema>();
}
