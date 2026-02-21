// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.12
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class SkillStateSchema extends Schema {
    @type("string") public skillId!: string;
    @type("string") public actionId!: string;
    @type("number") public lastUsedTime!: number;
    @type("number") public cooldownRemaining!: number;
}
