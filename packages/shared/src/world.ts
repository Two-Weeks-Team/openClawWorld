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
  tileSize: 16,
  pixelWidth: 1024,
  pixelHeight: 1024,
} as const;

export const ZONE_BOUNDS: Record<ZoneId, ZoneBounds> = {
  lobby: { x: 96, y: 32, width: 192, height: 192 },
  office: { x: 672, y: 32, width: 320, height: 224 },
  'central-park': { x: 320, y: 256, width: 384, height: 320 },
  arcade: { x: 704, y: 256, width: 288, height: 256 },
  meeting: { x: 32, y: 448, width: 256, height: 288 },
  'lounge-cafe': { x: 288, y: 608, width: 320, height: 224 },
  plaza: { x: 608, y: 608, width: 256, height: 256 },
  lake: { x: 32, y: 32, width: 64, height: 224 },
};

export const DEFAULT_SPAWN_POINT: SpawnPoint = {
  x: 512,
  y: 512,
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
