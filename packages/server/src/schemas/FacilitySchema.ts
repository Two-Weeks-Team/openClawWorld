import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import type { ZoneId } from '@openclawworld/shared';
import { Vector2Schema } from './EntitySchema.js';

export class FacilitySchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  type: string = '';

  @type('string')
  zoneId: ZoneId = 'lobby';

  @type(Vector2Schema)
  position: Vector2Schema = new Vector2Schema();

  @type({ map: 'string' })
  state: MapSchema<string> = new MapSchema<string>();

  @type(['string'])
  affordances: ArraySchema<string> = new ArraySchema<string>();

  constructor(id?: string, facilityType?: string, zoneId?: ZoneId, x?: number, y?: number) {
    super();
    if (id !== undefined) this.id = id;
    if (facilityType !== undefined) this.type = facilityType;
    if (zoneId !== undefined) this.zoneId = zoneId;
    if (x !== undefined) this.position.x = x;
    if (y !== undefined) this.position.y = y;
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  setState(key: string, value: string): void {
    this.state.set(key, value);
  }

  getState(key: string): string | undefined {
    return this.state.get(key);
  }

  addAffordance(action: string): void {
    if (!this.affordances.includes(action)) {
      this.affordances.push(action);
    }
  }

  removeAffordance(action: string): void {
    const index = this.affordances.indexOf(action);
    if (index !== -1) {
      this.affordances.splice(index, 1);
    }
  }

  hasAffordance(action: string): boolean {
    return this.affordances.includes(action);
  }

  setAffordances(actions: string[]): void {
    this.affordances.clear();
    for (const action of actions) {
      this.affordances.push(action);
    }
  }

  getAffordances(): string[] {
    return Array.from(this.affordances);
  }
}
