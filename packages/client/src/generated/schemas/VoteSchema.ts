//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { VoteOptionSchema } from './VoteOptionSchema';
import { VoteCastSchema } from './VoteCastSchema';

export class VoteSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public meetingId!: string;
  @type('string') public question!: string;
  @type({ map: VoteOptionSchema }) public options: MapSchema<VoteOptionSchema> =
    new MapSchema<VoteOptionSchema>();
  @type({ map: VoteCastSchema }) public casts: MapSchema<VoteCastSchema> =
    new MapSchema<VoteCastSchema>();
  @type('boolean') public anonymous!: boolean;
  @type('string') public status!: string;
  @type('string') public createdBy!: string;
  @type('number') public createdAt!: number;
  @type('number') public closedAt!: number;
}
