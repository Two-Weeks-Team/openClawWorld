import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.tilemapTiledJSON('lobby', 'assets/maps/lobby.json');
    this.load.svg('tileset', 'assets/maps/tileset.svg', { width: 64, height: 32 });

    this.load.svg('player-human', 'assets/sprites/player-human.svg', { width: 32, height: 32 });
    this.load.svg('player-agent', 'assets/sprites/player-agent.svg', { width: 32, height: 32 });
    this.load.svg('player-object', 'assets/sprites/player-object.svg', { width: 32, height: 32 });
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
