/**
 * Map layer names as used in Tiled JSON and Phaser tilemap.
 * Single source of truth -- used by GameScene, BootScene, and verify scripts.
 */
export const MAP_LAYERS = {
  GROUND: 'ground',
  COLLISION: 'collision',
  OBJECTS: 'objects',
} as const;

export type MapLayerName = (typeof MAP_LAYERS)[keyof typeof MAP_LAYERS];

/**
 * Tileset names as used in Tiled JSON map files.
 * Must match the tileset names embedded in the .json map file.
 */
export const MAP_TILESETS = [
  'tileset',
  'urban_tileset',
  'tinytown_tileset',
  'interior_tileset',
] as const;

export type MapTilesetName = (typeof MAP_TILESETS)[number];
