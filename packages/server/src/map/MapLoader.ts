import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type {
  MapData,
  ParsedMap,
  CollisionGrid,
  TiledProperty,
  TiledLayer,
  ZoneId,
} from '@openclawworld/shared';
import type { ZoneMapData } from '../world/WorldPackLoader.js';

const DEFAULT_MAPS_PATH = resolve(process.cwd(), 'assets/maps');

export class MapLoadError extends Error {
  constructor(
    message: string,
    public readonly mapId: string
  ) {
    super(`[MapLoader] Failed to load map "${mapId}": ${message}`);
    this.name = 'MapLoadError';
  }
}

export class MapLoader {
  private mapsPath: string;

  constructor(mapsPath?: string) {
    this.mapsPath = mapsPath ?? DEFAULT_MAPS_PATH;
  }

  loadMap(mapId: string): ParsedMap {
    const filePath = resolve(this.mapsPath, `${mapId}.json`);

    let fileContent: string;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch {
      throw new MapLoadError(`Map file not found at ${filePath}`, mapId);
    }

    let mapData: MapData;
    try {
      mapData = JSON.parse(fileContent) as MapData;
    } catch (error) {
      throw new MapLoadError(
        `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
        mapId
      );
    }

    this.validateMapData(mapData, mapId);

    const collisionGrid = this.buildCollisionGrid(mapData);
    const objects = this.extractObjects(mapData);

    return {
      mapId,
      width: mapData.width,
      height: mapData.height,
      tileSize: mapData.tilewidth,
      collisionGrid,
      layers: mapData.layers,
      objects,
    };
  }

  private validateMapData(mapData: MapData, mapId: string): void {
    if (!mapData.layers || !Array.isArray(mapData.layers)) {
      throw new MapLoadError('Missing or invalid layers array', mapId);
    }

    if (typeof mapData.width !== 'number' || mapData.width <= 0) {
      throw new MapLoadError('Invalid or missing map width', mapId);
    }

    if (typeof mapData.height !== 'number' || mapData.height <= 0) {
      throw new MapLoadError('Invalid or missing map height', mapId);
    }

    if (typeof mapData.tilewidth !== 'number' || mapData.tilewidth <= 0) {
      throw new MapLoadError('Invalid or missing tile width', mapId);
    }

    if (typeof mapData.tileheight !== 'number' || mapData.tileheight <= 0) {
      throw new MapLoadError('Invalid or missing tile height', mapId);
    }
  }

  private buildCollisionGrid(mapData: MapData): CollisionGrid {
    const { width, height } = mapData;
    const grid: CollisionGrid = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    const collisionLayer = mapData.layers.find(
      (layer: TiledLayer) => layer.name === 'collision' && layer.type === 'tilelayer'
    );

    if (!collisionLayer || !collisionLayer.data) {
      return grid;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const tileIndex = collisionLayer.data[index];
        grid[y][x] = tileIndex > 0;
      }
    }

    return grid;
  }

  private extractObjects(mapData: MapData): Array<{
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: TiledProperty[];
  }> {
    const objects: Array<{
      id: number;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: TiledProperty[];
    }> = [];

    for (const layer of mapData.layers as TiledLayer[]) {
      if (layer.type === 'objectgroup' && layer.objects) {
        objects.push(...layer.objects);
      }
    }

    return objects;
  }

  getMapPath(): string {
    return this.mapsPath;
  }

  loadZoneMap(packPath: string, zoneId: ZoneId): ParsedMap {
    const mapPath = join(packPath, 'maps', `${zoneId}.json`);

    if (!existsSync(mapPath)) {
      throw new MapLoadError(`Zone map file not found at ${mapPath}`, zoneId);
    }

    let fileContent: string;
    try {
      fileContent = readFileSync(mapPath, 'utf-8');
    } catch {
      throw new MapLoadError(`Failed to read zone map at ${mapPath}`, zoneId);
    }

    let mapData: MapData;
    try {
      mapData = JSON.parse(fileContent) as MapData;
    } catch (error) {
      throw new MapLoadError(
        `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
        zoneId
      );
    }

    this.validateMapData(mapData, zoneId);

    const collisionGrid = this.buildCollisionGrid(mapData);
    const objects = this.extractObjects(mapData);

    return {
      mapId: zoneId,
      width: mapData.width,
      height: mapData.height,
      tileSize: mapData.tilewidth,
      collisionGrid,
      layers: mapData.layers,
      objects,
    };
  }

  loadZoneMapFromData(zoneMapData: ZoneMapData): ParsedMap {
    const collisionGrid = this.buildCollisionGridFromLayers(
      zoneMapData.layers,
      zoneMapData.width,
      zoneMapData.height
    );

    return {
      mapId: zoneMapData.zoneId,
      width: zoneMapData.width,
      height: zoneMapData.height,
      tileSize: zoneMapData.tileWidth,
      collisionGrid,
      layers: zoneMapData.layers,
      objects: zoneMapData.objects,
    };
  }

  private buildCollisionGridFromLayers(
    layers: TiledLayer[],
    width: number,
    height: number
  ): CollisionGrid {
    const grid: CollisionGrid = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    const collisionLayer = layers.find(
      (layer: TiledLayer) => layer.name === 'collision' && layer.type === 'tilelayer'
    );

    if (!collisionLayer || !collisionLayer.data) {
      return grid;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const tileIndex = collisionLayer.data[index];
        grid[y][x] = tileIndex > 0;
      }
    }

    return grid;
  }

  mergeZoneMaps(zoneMaps: Map<ZoneId, ZoneMapData>): ParsedMap {
    if (zoneMaps.size === 0) {
      throw new MapLoadError('No zone maps provided for merge', 'merged');
    }

    const zones = Array.from(zoneMaps.values());
    const firstZone = zones[0];
    const tileSize = firstZone.tileWidth;

    let maxX = 0;
    let maxY = 0;

    for (const zone of zones) {
      const zoneEndX = zone.bounds.x + zone.bounds.width;
      const zoneEndY = zone.bounds.y + zone.bounds.height;
      maxX = Math.max(maxX, zoneEndX);
      maxY = Math.max(maxY, zoneEndY);
    }

    const totalWidthTiles = Math.ceil(maxX / tileSize);
    const totalHeightTiles = Math.ceil(maxY / tileSize);

    const mergedCollisionGrid: CollisionGrid = Array(totalHeightTiles)
      .fill(null)
      .map(() => Array(totalWidthTiles).fill(false));

    const mergedObjects: Array<{
      id: number;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: TiledProperty[];
    }> = [];

    let objectIdOffset = 0;

    for (const zone of zones) {
      const parsedZone = this.loadZoneMapFromData(zone);
      const zoneOffsetTileX = Math.floor(zone.bounds.x / tileSize);
      const zoneOffsetTileY = Math.floor(zone.bounds.y / tileSize);

      for (let y = 0; y < parsedZone.height; y++) {
        for (let x = 0; x < parsedZone.width; x++) {
          const targetY = zoneOffsetTileY + y;
          const targetX = zoneOffsetTileX + x;

          if (
            targetY >= 0 &&
            targetY < totalHeightTiles &&
            targetX >= 0 &&
            targetX < totalWidthTiles
          ) {
            mergedCollisionGrid[targetY][targetX] = parsedZone.collisionGrid[y][x];
          }
        }
      }

      for (const obj of parsedZone.objects) {
        mergedObjects.push({
          ...obj,
          id: obj.id + objectIdOffset,
          x: obj.x + zone.bounds.x,
          y: obj.y + zone.bounds.y,
        });
      }

      objectIdOffset += 1000;
    }

    return {
      mapId: 'world',
      width: totalWidthTiles,
      height: totalHeightTiles,
      tileSize,
      collisionGrid: mergedCollisionGrid,
      layers: [],
      objects: mergedObjects,
    };
  }
}

export function loadMap(mapId: string, mapsPath?: string): ParsedMap {
  const loader = new MapLoader(mapsPath);
  return loader.loadMap(mapId);
}

export function loadZoneMap(packPath: string, zoneId: ZoneId, mapsPath?: string): ParsedMap {
  const loader = new MapLoader(mapsPath);
  return loader.loadZoneMap(packPath, zoneId);
}
