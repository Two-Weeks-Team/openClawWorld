import type { ParsedMap, CollisionGrid, TileCoord, Vec2 } from '@openclawworld/shared';

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class CollisionSystem {
  private grid: CollisionGrid;
  private width: number;
  private height: number;
  private tileSize: number;
  private mapId: string;

  constructor(parsedMap: ParsedMap) {
    this.grid = parsedMap.collisionGrid;
    this.width = parsedMap.width;
    this.height = parsedMap.height;
    this.tileSize = parsedMap.tileSize;
    this.mapId = parsedMap.mapId;
  }

  isBlocked(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
      return true;
    }
    return this.grid[ty][tx];
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.worldToTile(x, y);
    return !this.isBlocked(tile.tx, tile.ty);
  }

  worldToTile(x: number, y: number): TileCoord {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return { tx, ty };
  }

  tileToWorld(tx: number, ty: number): Vec2 {
    const x = tx * this.tileSize + this.tileSize / 2;
    const y = ty * this.tileSize + this.tileSize / 2;
    return { x, y };
  }

  checkAABBCollision(bounds: Bounds): boolean {
    const minTileX = Math.floor(bounds.x / this.tileSize);
    const minTileY = Math.floor(bounds.y / this.tileSize);
    const maxTileX = Math.floor((bounds.x + bounds.width) / this.tileSize);
    const maxTileY = Math.floor((bounds.y + bounds.height) / this.tileSize);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.isBlocked(tx, ty)) {
          return true;
        }
      }
    }

    return false;
  }

  getGrid(): CollisionGrid {
    return this.grid.map((row: boolean[]) => [...row]);
  }

  getMapDimensions(): { width: number; height: number; tileSize: number } {
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
    };
  }

  getMapId(): string {
    return this.mapId;
  }

  isInBounds(tx: number, ty: number): boolean {
    return tx >= 0 && tx < this.width && ty >= 0 && ty < this.height;
  }

  getWorldBounds(): Bounds {
    return {
      x: 0,
      y: 0,
      width: this.width * this.tileSize,
      height: this.height * this.tileSize,
    };
  }
}
