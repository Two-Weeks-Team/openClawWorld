import { Schema, type } from '@colyseus/schema';
import type { OrgRole } from '@openclawworld/shared';

export class TeamMemberSchema extends Schema {
  @type('string')
  entityId: string = '';

  @type('string')
  role: OrgRole = 'member';

  @type('number')
  joinedAt: number = 0;

  constructor(entityId?: string, role?: OrgRole) {
    super();
    if (entityId !== undefined) this.entityId = entityId;
    if (role !== undefined) this.role = role;
    this.joinedAt = Date.now();
  }
}
