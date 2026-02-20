import Phaser from 'phaser';

const WALK_FRAME_RATE = 4;

const PLAYER_KEYS = ['player-human', 'player-agent'] as const;

const NPC_KEYS = [
  'greeter',
  'security',
  'office-pm',
  'it-help',
  'meeting-host',
  'barista',
  'arcade-host',
  'ranger',
  'fountain-keeper',
] as const;

export function createWalkAnimations(scene: Phaser.Scene): void {
  for (const key of PLAYER_KEYS) {
    const animKey = `${key}_walk`;
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({
      key: animKey,
      frames: [
        { key: 'players', frame: key },
        { key: 'players', frame: `${key}_walk1` },
        { key: 'players', frame: `${key}_walk2` },
      ],
      frameRate: WALK_FRAME_RATE,
      repeat: -1,
    });
  }

  for (const key of NPC_KEYS) {
    const animKey = `${key}_walk`;
    if (scene.anims.exists(animKey)) continue;
    scene.anims.create({
      key: animKey,
      frames: [
        { key: 'npcs', frame: key },
        { key: 'npcs', frame: `${key}_walk1` },
        { key: 'npcs', frame: `${key}_walk2` },
      ],
      frameRate: WALK_FRAME_RATE,
      repeat: -1,
    });
  }
}

export function updatePlayerAnimation(
  sprite: Phaser.GameObjects.Sprite,
  isMoving: boolean,
  facing: string,
  entityType: 'human' | 'agent'
): void {
  const baseKey = entityType === 'agent' ? 'player-agent' : 'player-human';
  const animKey = `${baseKey}_walk`;

  if (facing === 'left') {
    sprite.setFlipX(true);
  } else if (facing === 'right') {
    sprite.setFlipX(false);
  }

  if (isMoving) {
    if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
      sprite.play(animKey);
    }
  } else {
    if (sprite.anims.isPlaying) {
      sprite.stop();
    }
    sprite.setFrame(baseKey);
  }
}

export function updateNPCAnimation(
  sprite: Phaser.GameObjects.Sprite,
  isWalking: boolean,
  facing: string,
  npcRole: string
): void {
  const animKey = `${npcRole}_walk`;

  if (facing === 'left') {
    sprite.setFlipX(true);
  } else if (facing === 'right') {
    sprite.setFlipX(false);
  }

  if (isWalking) {
    if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
      sprite.play(animKey);
    }
  } else {
    if (sprite.anims.isPlaying) {
      sprite.stop();
    }
    sprite.setFrame(npcRole);
  }
}

export const NPC_ROLE_TO_SPRITE: Record<string, string> = {
  receptionist: 'greeter',
  greeter: 'greeter',
  security: 'security',
  guard: 'security',
  'office-pm': 'office-pm',
  pm: 'office-pm',
  manager: 'office-pm',
  'it-help': 'it-help',
  it: 'it-help',
  tech: 'it-help',
  'meeting-host': 'meeting-host',
  host: 'meeting-host',
  barista: 'barista',
  cafe: 'barista',
  'arcade-host': 'arcade-host',
  arcade: 'arcade-host',
  ranger: 'ranger',
  park: 'ranger',
  'fountain-keeper': 'fountain-keeper',
  fountain: 'fountain-keeper',
  keeper: 'fountain-keeper',
};

export function getNPCSpriteKey(definitionId: string, role?: string): string {
  if (NPC_ROLE_TO_SPRITE[definitionId]) {
    return NPC_ROLE_TO_SPRITE[definitionId];
  }
  if (role && NPC_ROLE_TO_SPRITE[role]) {
    return NPC_ROLE_TO_SPRITE[role];
  }
  const lowerDef = definitionId.toLowerCase();
  for (const [key, value] of Object.entries(NPC_ROLE_TO_SPRITE)) {
    if (lowerDef.includes(key)) {
      return value;
    }
  }
  return 'greeter';
}
