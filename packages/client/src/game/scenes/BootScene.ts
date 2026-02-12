import Phaser from 'phaser';

// Single unified map for the entire world
const ZONE_IDS = ['village'] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const zoneId of ZONE_IDS) {
      this.load.tilemapTiledJSON(zoneId, `assets/maps/${zoneId}.json`);
    }

    this.load.image('tileset', 'assets/maps/tileset.png');

    this.load.svg('player-human', 'assets/sprites/player-human.svg', { width: 32, height: 32 });
    this.load.svg('player-agent', 'assets/sprites/player-agent.svg', { width: 32, height: 32 });
    this.load.svg('player-object', 'assets/sprites/player-object.svg', { width: 32, height: 32 });

    this.load.svg('chest', 'assets/sprites/chest.svg', { width: 32, height: 32 });
    this.load.svg('chest-open', 'assets/sprites/chest-open.svg', { width: 32, height: 32 });
    this.load.svg('sign', 'assets/sprites/sign.svg', { width: 32, height: 32 });
    this.load.svg('portal', 'assets/sprites/portal.svg', { width: 32, height: 32 });
    this.load.svg('fountain', 'assets/sprites/fountain.svg', { width: 32, height: 32 });
    this.load.svg('lamp', 'assets/sprites/lamp.svg', { width: 32, height: 32 });
    this.load.svg('bench', 'assets/sprites/bench.svg', { width: 32, height: 32 });

    this.load.atlas('npcs', 'assets/sprites/npcs.png', 'assets/sprites/npcs.json');
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

    const urlParams = new URLSearchParams(window.location.search);
    const sceneParam = urlParams.get('scene');

    if (sceneParam === 'gallery') {
      this.scene.start('AssetGalleryScene');
    } else {
      this.scene.start('GameScene');
    }
  }
}
