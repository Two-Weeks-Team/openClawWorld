// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.14
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class OrganizationSchema extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public description!: string;
    @type("string") public logoUrl!: string;
    @type("string") public ownerId!: string;
    @type("number") public createdAt!: number;
}
