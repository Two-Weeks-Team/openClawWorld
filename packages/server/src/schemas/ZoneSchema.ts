import { Schema, type } from '@colyseus/schema';
import type { ZoneId } from '@openclawworld/shared';

export class ZoneSchema extends Schema {
  @type('string')
  id: ZoneId = 'plaza';

  @type('string')
  name: string = '';

  @type('number')
  x: number = 0;

  @type('number')
  y: number = 0;

  @type('number')
  width: number = 0;

  @type('number')
  height: number = 0;

  @type('number')
  currentOccupancy: number = 0;

  @type('number')
  maxOccupancy: number = 100;

  constructor(
    id?: ZoneId,
    name?: string,
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    maxOccupancy?: number
  ) {
    super();
    if (id !== undefined) this.id = id;
    if (name !== undefined) this.name = name;
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    if (width !== undefined) this.width = width;
    if (height !== undefined) this.height = height;
    if (maxOccupancy !== undefined) this.maxOccupancy = maxOccupancy;
  }
}
