import { Schema, type } from '@colyseus/schema';
import type { NpcState, NpcRole, ZoneId, Facing } from '@openclawworld/shared';

export class NPCSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  definitionId: string = '';

  @type('string')
  name: string = '';

  @type('string')
  role: NpcRole = 'receptionist';

  @type('string')
  currentState: NpcState = 'idle';

  @type('string')
  zone: ZoneId = 'plaza';

  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;

  @type('string')
  facing: Facing = 'down';

  @type('number')
  dialogueIndex: number = 0;

  constructor(id?: string, definitionId?: string, name?: string, role?: NpcRole) {
    super();
    if (id !== undefined) this.id = id;
    if (definitionId !== undefined) this.definitionId = definitionId;
    if (name !== undefined) this.name = name;
    if (role !== undefined) this.role = role;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
  }

  setState(state: NpcState): void {
    this.currentState = state;
  }

  setZone(zone: ZoneId): void {
    this.zone = zone;
  }
}
