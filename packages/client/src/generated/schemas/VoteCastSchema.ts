// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.12
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class VoteCastSchema extends Schema {
    @type("string") public id!: string;
    @type("string") public optionId!: string;
    @type("string") public voterId!: string;
    @type("number") public castedAt!: number;
}
