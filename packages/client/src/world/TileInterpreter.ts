import type { TileInfo, TileType, WorldGrid, ZoneId } from '@openclawworld/shared';

type ColorRange = {
  r: [number, number];
  g: [number, number];
  b: [number, number];
  type: TileType;
  collision: boolean;
  isDoor?: boolean;
};

const COLOR_RANGES: ColorRange[] = [
  { r: [0, 50], g: [100, 200], b: [200, 255], type: 'water', collision: true },
  { r: [0, 100], g: [150, 255], b: [0, 100], type: 'grass', collision: false },
  { r: [200, 255], g: [200, 255], b: [0, 100], type: 'door', collision: false, isDoor: true },
  { r: [60, 100], g: [50, 80], b: [40, 70], type: 'wall', collision: true },
  { r: [180, 220], g: [180, 220], b: [180, 220], type: 'road', collision: false },
  { r: [150, 180], g: [150, 180], b: [150, 180], type: 'floor_plaza', collision: false },
  { r: [170, 200], g: [200, 230], b: [210, 240], type: 'floor_north', collision: false },
  { r: [190, 220], g: [200, 230], b: [190, 220], type: 'floor_west', collision: false },
  { r: [200, 230], g: [180, 210], b: [150, 180], type: 'floor_east', collision: false },
  { r: [140, 170], g: [140, 170], b: [140, 170], type: 'floor_south', collision: false },
  { r: [100, 130], g: [140, 170], b: [200, 230], type: 'floor_lake', collision: false },
];

const ZONE_FLOOR_TYPES: Map<TileType, ZoneId> = new Map([
  ['floor_plaza', 'plaza'],
  ['floor_north', 'office'],
  ['floor_west', 'meeting'],
  ['floor_east', 'arcade'],
  ['floor_south', 'lounge-cafe'],
  ['floor_lake', 'lake'],
]);

export class TileInterpreter {
  private tileSize: number;
  private worldGrid: WorldGrid | null = null;

  constructor(tileSize: number = 32) {
    this.tileSize = tileSize;
  }

  loadFromTiledData(
    width: number,
    height: number,
    groundData: number[],
    collisionData: number[]
  ): WorldGrid {
    const grid: WorldGrid = [];

    for (let y = 0; y < height; y++) {
      const row: TileInfo[] = [];
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const groundTile = groundData[index] || 0;
        const collisionTile = collisionData[index] || 0;

        const tileInfo = this.interpretTileId(groundTile, collisionTile > 0);
        row.push(tileInfo);
      }
      grid.push(row);
    }

    this.worldGrid = grid;
    return grid;
  }

  loadFromImage(
    scene: Phaser.Scene,
    imageKey: string,
    mapWidth: number,
    mapHeight: number
  ): WorldGrid {
    const texture = scene.textures.get(imageKey);
    if (!texture || texture.key === '__MISSING') {
      throw new Error(`Texture "${imageKey}" not found`);
    }

    const source = texture.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    ctx.drawImage(source, 0, 0);

    const grid: WorldGrid = [];
    const tilesX = Math.min(mapWidth, Math.floor(source.width / this.tileSize));
    const tilesY = Math.min(mapHeight, Math.floor(source.height / this.tileSize));

    for (let y = 0; y < tilesY; y++) {
      const row: TileInfo[] = [];
      for (let x = 0; x < tilesX; x++) {
        const sampleX = x * this.tileSize + this.tileSize / 2;
        const sampleY = y * this.tileSize + this.tileSize / 2;
        const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;

        const tileInfo = this.interpretColor(pixel[0], pixel[1], pixel[2]);
        row.push(tileInfo);
      }
      grid.push(row);
    }

    this.worldGrid = grid;
    return grid;
  }

  private interpretTileId(tileId: number, hasCollision: boolean): TileInfo {
    const tileTypes: TileType[] = [
      'empty',
      'grass',
      'road',
      'floor_plaza',
      'floor_north',
      'floor_west',
      'floor_east',
      'floor_south',
      'floor_lake',
      'door',
      'wall',
      'water',
      'decoration',
    ];

    const type = tileTypes[tileId] || 'empty';
    const isDoor = type === 'door';
    const collision = hasCollision && !isDoor;
    const zoneId = ZONE_FLOOR_TYPES.get(type);

    return { type, collision, isDoor, zoneId };
  }

  private interpretColor(r: number, g: number, b: number): TileInfo {
    for (const range of COLOR_RANGES) {
      if (
        r >= range.r[0] &&
        r <= range.r[1] &&
        g >= range.g[0] &&
        g <= range.g[1] &&
        b >= range.b[0] &&
        b <= range.b[1]
      ) {
        const zoneId = ZONE_FLOOR_TYPES.get(range.type);
        return {
          type: range.type,
          collision: range.collision,
          isDoor: range.isDoor || false,
          zoneId,
        };
      }
    }

    return { type: 'grass', collision: false, isDoor: false };
  }

  getWorldGrid(): WorldGrid | null {
    return this.worldGrid;
  }

  getTileAt(tx: number, ty: number): TileInfo | null {
    if (!this.worldGrid) return null;
    if (ty < 0 || ty >= this.worldGrid.length) return null;
    if (tx < 0 || tx >= this.worldGrid[ty].length) return null;
    return this.worldGrid[ty][tx];
  }

  isBlocked(tx: number, ty: number): boolean {
    const tile = this.getTileAt(tx, ty);
    if (!tile) return true;
    return tile.collision;
  }

  isDoorTile(tx: number, ty: number): boolean {
    const tile = this.getTileAt(tx, ty);
    return tile?.isDoor || false;
  }

  getZoneAt(tx: number, ty: number): ZoneId | undefined {
    const tile = this.getTileAt(tx, ty);
    return tile?.zoneId;
  }
}
