import { Schema, type } from '@colyseus/schema';

export class GameMap extends Schema {
  @type('string')
  mapId: string = '';

  @type('number')
  width: number = 0;

  @type('number')
  height: number = 0;

  @type('number')
  tileSize: number = 0;

  constructor(mapId: string, width: number, height: number, tileSize: number) {
    super();
    this.mapId = mapId;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
  }
}
