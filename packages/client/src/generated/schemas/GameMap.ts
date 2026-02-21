//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.12
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class GameMap extends Schema {
  @type('string') public mapId!: string;
  @type('number') public width!: number;
  @type('number') public height!: number;
  @type('number') public tileSize!: number;
}
