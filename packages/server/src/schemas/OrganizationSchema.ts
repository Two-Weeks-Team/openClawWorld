import { Schema, type } from '@colyseus/schema';

export class OrganizationSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  name: string = '';

  @type('string')
  description: string = '';

  @type('string')
  logoUrl: string = '';

  @type('string')
  ownerId: string = '';

  @type('number')
  createdAt: number = 0;

  constructor(id?: string, name?: string, ownerId?: string) {
    super();
    if (id !== undefined) this.id = id;
    if (name !== undefined) this.name = name;
    if (ownerId !== undefined) this.ownerId = ownerId;
    this.createdAt = Date.now();
  }
}
