// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.14
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class StickyNoteSchema extends Schema {
    @type("string") public id!: string;
    @type("number") public x!: number;
    @type("number") public y!: number;
    @type("string") public text!: string;
    @type("string") public color!: string;
    @type("string") public authorId!: string;
    @type("number") public createdAt!: number;
}
