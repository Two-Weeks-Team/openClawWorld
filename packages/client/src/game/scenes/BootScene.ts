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
    this.load.image('urban_tileset', 'assets/maps/urban_tileset.png');

    this.load.atlas('players', 'assets/sprites/players.png', 'assets/sprites/players.json');
    this.load.atlas('objects', 'assets/sprites/objects.png', 'assets/sprites/objects.json');
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
