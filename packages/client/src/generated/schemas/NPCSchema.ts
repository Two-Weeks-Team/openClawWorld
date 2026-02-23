//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.14
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';

export class NPCSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public definitionId!: string;
  @type('string') public name!: string;
  @type('string') public role!: string;
  @type('string') public currentState!: string;
  @type('string') public zone!: string;
  @type('number') public x!: number;
  @type('number') public y!: number;
  @type('string') public facing!: string;
  @type('number') public dialogueIndex!: number;
}
