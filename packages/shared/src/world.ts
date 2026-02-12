import type { ZoneId } from './types.js';

export type ZoneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpawnPoint = {
  x: number;
  y: number;
  tx: number;
  ty: number;
};

export const MAP_CONFIG = {
  width: 64,
  height: 64,
  tileSize: 32,
  pixelWidth: 2048,
  pixelHeight: 2048,
} as const;

export const ZONE_BOUNDS: Record<ZoneId, ZoneBounds> = {
  plaza: { x: 768, y: 768, width: 512, height: 512 },
  'north-block': { x: 576, y: 64, width: 768, height: 384 },
  'west-block': { x: 64, y: 704, width: 640, height: 640 },
  'east-block': { x: 1472, y: 704, width: 576, height: 640 },
  'south-block': { x: 576, y: 1472, width: 768, height: 384 },
  lake: { x: 1408, y: 1408, width: 640, height: 640 },
};

export const DEFAULT_SPAWN_POINT: SpawnPoint = {
  x: 1024,
  y: 1024,
  tx: 32,
  ty: 32,
};

export const ZONE_COLORS: Record<ZoneId, number> = {
  plaza: 0x808080,
  'north-block': 0x4a90d9,
  'west-block': 0xdaa520,
  'east-block': 0x8b4513,
  'south-block': 0x9932cc,
  lake: 0x4169e1,
};

export const DEBUG_COLORS = {
  collision: 0xff0000,
  mapBorder: 0xffffff,
  spawn: 0x00ff00,
  currentZone: 0xffff00,
} as const;

export const ZONE_IDS: readonly ZoneId[] = [
  'plaza',
  'north-block',
  'west-block',
  'east-block',
  'south-block',
  'lake',
] as const;

export function getZoneBoundsMap(): Map<ZoneId, ZoneBounds> {
  return new Map(Object.entries(ZONE_BOUNDS) as [ZoneId, ZoneBounds][]);
}
