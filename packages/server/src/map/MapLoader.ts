import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  MapData,
  ParsedMap,
  CollisionGrid,
  TiledProperty,
  TiledLayer,
} from '@openclawworld/shared';

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
    } catch (error) {
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
}

export function loadMap(mapId: string, mapsPath?: string): ParsedMap {
  const loader = new MapLoader(mapsPath);
  return loader.loadMap(mapId);
}
