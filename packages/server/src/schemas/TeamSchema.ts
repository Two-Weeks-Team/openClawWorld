import { Schema, type, MapSchema } from '@colyseus/schema';
import { TeamMemberSchema } from './TeamMemberSchema.js';

export class TeamSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  orgId: string = '';

  @type('string')
  name: string = '';

  @type('string')
  description: string = '';

  @type('number')
  createdAt: number = 0;

  @type({ map: TeamMemberSchema })
  members: MapSchema<TeamMemberSchema> = new MapSchema<TeamMemberSchema>();

  constructor(id?: string, orgId?: string, name?: string) {
    super();
    if (id !== undefined) this.id = id;
    if (orgId !== undefined) this.orgId = orgId;
    if (name !== undefined) this.name = name;
    this.createdAt = Date.now();
  }
}
