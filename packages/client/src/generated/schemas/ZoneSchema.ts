//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.12
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class ZoneSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public name!: string;
  @type('number') public x!: number;
  @type('number') public y!: number;
  @type('number') public width!: number;
  @type('number') public height!: number;
  @type('number') public currentOccupancy!: number;
  @type('number') public maxOccupancy!: number;
}
