import Phaser from 'phaser';

const ZONE_IDS = ['lobby', 'office', 'meeting-center', 'lounge-cafe', 'arcade'] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const zoneId of ZONE_IDS) {
      this.load.tilemapTiledJSON(zoneId, `assets/maps/${zoneId}.json`);
    }

    this.load.svg('tileset', 'assets/maps/tileset.svg', { width: 256, height: 128 });

    this.load.svg('player-human', 'assets/sprites/player-human.svg', { width: 32, height: 32 });
    this.load.svg('player-agent', 'assets/sprites/player-agent.svg', { width: 32, height: 32 });
    this.load.svg('player-object', 'assets/sprites/player-object.svg', { width: 32, height: 32 });

    this.load.svg('chest', 'assets/sprites/chest.svg', { width: 32, height: 32 });
    this.load.svg('chest-open', 'assets/sprites/chest-open.svg', { width: 32, height: 32 });
    this.load.svg('sign', 'assets/sprites/sign.svg', { width: 32, height: 32 });
    this.load.svg('portal', 'assets/sprites/portal.svg', { width: 32, height: 32 });
    this.load.svg('npc', 'assets/sprites/npc.svg', { width: 32, height: 32 });
    this.load.svg('fountain', 'assets/sprites/fountain.svg', { width: 32, height: 32 });
    this.load.svg('lamp', 'assets/sprites/lamp.svg', { width: 32, height: 32 });
    this.load.svg('bench', 'assets/sprites/bench.svg', { width: 32, height: 32 });
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('tile-placeholder', 32, 32);

    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('selection-marker', 32, 32);

    this.scene.start('GameScene');
  }
}
