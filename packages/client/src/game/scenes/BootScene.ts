import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.tilemapTiledJSON('lobby', 'assets/maps/lobby.json');
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('tile-placeholder', 32, 32);

    graphics.clear();
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, 24, 24);
    graphics.generateTexture('player-human', 24, 24);

    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 24, 24);
    graphics.generateTexture('player-agent', 24, 24);

    graphics.clear();
    graphics.fillStyle(0x0000ff);
    graphics.fillRect(0, 0, 24, 24);
    graphics.generateTexture('player-object', 24, 24);

    graphics.clear();
    graphics.fillStyle(0xffff00);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('selection-marker', 32, 32);

    this.scene.start('GameScene');
  }
}
