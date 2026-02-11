import { Schema, MapSchema, type } from '@colyseus/schema';

export class KanbanCardSchema extends Schema {
  @type('string') id: string = '';
  @type('string') title: string = '';
  @type('string') description: string = '';
  @type('string') columnId: string = '';
  @type('number') order: number = 0;
  @type('string') createdBy: string = '';
  @type('number') createdAt: number = 0;

  constructor(
    id?: string,
    title?: string,
    description?: string,
    columnId?: string,
    order?: number,
    createdBy?: string
  ) {
    super();
    if (id !== undefined) this.id = id;
    if (title !== undefined) this.title = title;
    if (description !== undefined) this.description = description;
    if (columnId !== undefined) this.columnId = columnId;
    if (order !== undefined) this.order = order;
    if (createdBy !== undefined) this.createdBy = createdBy;
    this.createdAt = Date.now();
  }
}

export class KanbanColumnSchema extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') order: number = 0;
  @type({ map: KanbanCardSchema }) cards = new MapSchema<KanbanCardSchema>();

  constructor(id?: string, name?: string, order?: number) {
    super();
    if (id !== undefined) this.id = id;
    if (name !== undefined) this.name = name;
    if (order !== undefined) this.order = order;
  }
}

export class KanbanBoardSchema extends Schema {
  @type('string') id: string = '';
  @type('string') orgId: string = '';
  @type('string') name: string = '';
  @type({ map: KanbanColumnSchema }) columns = new MapSchema<KanbanColumnSchema>();

  constructor(id?: string, orgId?: string, name?: string) {
    super();
    if (id !== undefined) this.id = id;
    if (orgId !== undefined) this.orgId = orgId;
    if (name !== undefined) this.name = name;
  }
}
