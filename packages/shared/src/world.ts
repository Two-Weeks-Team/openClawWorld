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
  lobby: { x: 192, y: 64, width: 384, height: 384 },
  office: { x: 1344, y: 64, width: 640, height: 448 },
  'central-park': { x: 640, y: 512, width: 768, height: 640 },
  arcade: { x: 1408, y: 512, width: 576, height: 512 },
  meeting: { x: 64, y: 896, width: 512, height: 576 },
  'lounge-cafe': { x: 576, y: 1216, width: 640, height: 448 },
  plaza: { x: 1216, y: 1216, width: 512, height: 512 },
  lake: { x: 64, y: 64, width: 128, height: 448 },
};

export const DEFAULT_SPAWN_POINT: SpawnPoint = {
  x: 1024,
  y: 1024,
  tx: 32,
  ty: 32,
};

export const ZONE_COLORS: Record<ZoneId, number> = {
  lobby: 0x4a90d9,
  office: 0x4682b4,
  'central-park': 0x228b22,
  arcade: 0x9932cc,
  meeting: 0x8b4513,
  'lounge-cafe': 0xdaa520,
  plaza: 0x808080,
  lake: 0x4169e1,
};

export const ZONE_DISPLAY_NAMES: Record<ZoneId, string> = {
  lobby: 'LOBBY',
  office: 'OFFICE',
  'central-park': 'CENTRAL PARK',
  arcade: 'ARCADE',
  meeting: 'MEETING',
  'lounge-cafe': 'LOUNGE CAFÉ',
  plaza: 'PLAZA',
  lake: 'LAKE',
};

export const DEBUG_COLORS = {
  collision: 0xff0000,
  mapBorder: 0xffffff,
  spawn: 0x00ff00,
  currentZone: 0xffff00,
} as const;

export const ZONE_IDS: readonly ZoneId[] = [
  'lobby',
  'office',
  'central-park',
  'arcade',
  'meeting',
  'lounge-cafe',
  'plaza',
  'lake',
] as const;

export function getZoneBoundsMap(): Map<ZoneId, ZoneBounds> {
  return new Map(Object.entries(ZONE_BOUNDS) as [ZoneId, ZoneBounds][]);
}
