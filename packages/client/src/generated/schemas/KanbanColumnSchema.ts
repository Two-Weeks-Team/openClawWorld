// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.12
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { KanbanCardSchema } from './KanbanCardSchema'

export class KanbanColumnSchema extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("number") public order!: number;
    @type({ map: KanbanCardSchema }) public cards: MapSchema<KanbanCardSchema> = new MapSchema<KanbanCardSchema>();
}
