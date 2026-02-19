/**
 * CharacterPack - Modular avatar customization using Kenney Character Pack
 *
 * The character_pack atlas contains 8 skin tints, each with 5 body parts:
 *   head, arm, hand, leg, neck
 *
 * Frame naming convention: `tint{1-8}_{part}.png`
 *
 * This utility provides:
 *   - Deterministic tint assignment based on entity ID
 *   - Assembled character containers from modular parts
 *   - Consistent scaling to match the game's 16px tile grid
 */

import Phaser from 'phaser';

/** Number of available skin tints in the character pack. */
export const SKIN_TINT_COUNT = 8;

/** Body parts available per tint. */
export const BODY_PARTS = ['head', 'arm', 'hand', 'leg', 'neck'] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

/** Atlas key used by Phaser for the character pack spritesheet. */
export const CHARACTER_PACK_KEY = 'character_pack';

/**
 * Layout offsets for assembling body parts into a character, relative to the
 * container origin (center of the head). Values are in source-sprite pixels
 * before scaling.
 */
const PART_LAYOUT: Record<BodyPart, { x: number; y: number; depth: number }> = {
  head: { x: 0, y: 0, depth: 3 },
  neck: { x: 0, y: 70, depth: 1 },
  arm: { x: 0, y: 60, depth: 2 },
  leg: { x: 0, y: 120, depth: 0 },
  hand: { x: 60, y: 100, depth: 4 },
};

/**
 * Derive a deterministic tint index (1-8) from an entity identifier string.
 * Uses a simple hash so the same entity always gets the same skin tint.
 */
export function skinTintFromId(entityId: string): number {
  let hash = 0;
  for (let i = 0; i < entityId.length; i++) {
    hash = (hash * 31 + entityId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % SKIN_TINT_COUNT) + 1;
}

/**
 * Return the atlas frame key for a given tint and body part.
 * Example: `tint3_head.png`
 */
export function frameKey(tint: number, part: BodyPart): string {
  return `tint${tint}_${part}.png`;
}

/**
 * Scale factor to shrink the large character pack sprites (~170px head) down
 * to the game's 16px tile grid. The target assembled character height is
 * roughly 20px so it visually matches the existing player sprites.
 */
const CHARACTER_SCALE = 0.09;

/**
 * Create a Phaser Container holding an assembled character from the character
 * pack atlas. The container is placed at (worldX, worldY) and scaled to match
 * the game's 16px tile grid.
 */
export function createCharacter(
  scene: Phaser.Scene,
  tint: number,
  worldX: number,
  worldY: number
): Phaser.GameObjects.Container {
  const container = scene.add.container(worldX, worldY);

  for (const part of BODY_PARTS) {
    const key = frameKey(tint, part);
    const layout = PART_LAYOUT[part];
    const sprite = scene.add.sprite(layout.x, layout.y, CHARACTER_PACK_KEY, key);
    sprite.setOrigin(0.5, 0);
    sprite.setDepth(layout.depth);
    container.add(sprite);
  }

  container.setScale(CHARACTER_SCALE);
  return container;
}

/**
 * Create a simple single-sprite avatar using only the head frame from the
 * character pack. This provides a lighter alternative when the full assembled
 * character is not needed (e.g. minimap icons, chat portraits).
 */
export function createHeadSprite(scene: Phaser.Scene, tint: number): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(0, 0, CHARACTER_PACK_KEY, frameKey(tint, 'head'));
  sprite.setOrigin(0.5, 0.5);
  // Scale the ~173px head down to approximately 16px
  sprite.setScale(16 / 173);
  return sprite;
}
