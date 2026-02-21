// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.12
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vector2Schema } from './Vector2Schema'
import { TileCoordSchema } from './TileCoordSchema'
import { SkillStateSchema } from './SkillStateSchema'
import { ActiveEffectSchema } from './ActiveEffectSchema'

export class EntitySchema extends Schema {
    @type("string") public id!: string;
    @type("string") public kind!: string;
    @type("string") public name!: string;
    @type("string") public status!: string;
    @type("string") public statusMessage!: string;
    @type("string") public title!: string;
    @type("string") public department!: string;
    @type("string") public orgId!: string;
    @type("string") public teamId!: string;
    @type("string") public roomId!: string;
    @type(Vector2Schema) public pos: Vector2Schema = new Vector2Schema();
    @type(TileCoordSchema) public tile: TileCoordSchema = new TileCoordSchema();
    @type("string") public facing!: string;
    @type("string") public currentZone!: string;
    @type("number") public speed!: number;
    @type("number") public lastActivityAt!: number;
    @type({ map: "string" }) public meta: MapSchema<string> = new MapSchema<string>();
    @type({ map: SkillStateSchema }) public skillStates: MapSchema<SkillStateSchema> = new MapSchema<SkillStateSchema>();
    @type({ map: ActiveEffectSchema }) public activeEffects: MapSchema<ActiveEffectSchema> = new MapSchema<ActiveEffectSchema>();
}
