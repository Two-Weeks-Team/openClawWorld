//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class ActiveEffectSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public effectType!: string;
  @type('string') public sourceEntityId!: string;
  @type('string') public targetEntityId!: string;
  @type('number') public startTime!: number;
  @type('number') public expirationTime!: number;
  @type('number') public speedMultiplier!: number;
}
