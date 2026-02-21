//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 4.0.12
//

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { TeamMemberSchema } from './TeamMemberSchema';

export class TeamSchema extends Schema {
  @type('string') public id!: string;
  @type('string') public orgId!: string;
  @type('string') public name!: string;
  @type('string') public description!: string;
  @type('number') public createdAt!: number;
  @type({ map: TeamMemberSchema }) public members: MapSchema<TeamMemberSchema> =
    new MapSchema<TeamMemberSchema>();
}
