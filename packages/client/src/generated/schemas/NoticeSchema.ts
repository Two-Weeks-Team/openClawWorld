//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class NoticeSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public teamId!: string;
  @type('string') public title!: string;
  @type('string') public content!: string;
  @type('string') public authorId!: string;
  @type('number') public createdAt!: number;
  @type('boolean') public pinned!: boolean;
}
