//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class KanbanCardSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public title!: string;
  @type('string') public description!: string;
  @type('string') public columnId!: string;
  @type('number') public order!: number;
  @type('string') public createdBy!: string;
  @type('number') public createdAt!: number;
}
