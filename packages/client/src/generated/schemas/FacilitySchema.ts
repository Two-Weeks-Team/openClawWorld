//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.12
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vector2Schema } from './Vector2Schema';

export class FacilitySchema extends Schema {
  @type('string') public id!: string;
  @type('string') public type!: string;
  @type('string') public zoneId!: string;
  @type(Vector2Schema) public position: Vector2Schema = new Vector2Schema();
  @type({ map: 'string' }) public state: MapSchema<string> = new MapSchema<string>();
  @type(['string']) public affordances: ArraySchema<string> = new ArraySchema<string>();
}
