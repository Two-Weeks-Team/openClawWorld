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
    graphics.fillStyle(0xffff00);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('selection-marker', 32, 32);

    const humanGraphics = this.make.graphics({ x: 0, y: 0 });
    humanGraphics.fillStyle(0x4488ff);
    humanGraphics.fillCircle(16, 16, 14);
    humanGraphics.fillStyle(0xffffff);
    humanGraphics.fillCircle(12, 12, 4);
    humanGraphics.fillCircle(20, 12, 4);
    humanGraphics.fillStyle(0x000000);
    humanGraphics.fillCircle(12, 12, 2);
    humanGraphics.fillCircle(20, 12, 2);
    humanGraphics.generateTexture('player-human', 32, 32);

    const agentGraphics = this.make.graphics({ x: 0, y: 0 });
    agentGraphics.fillStyle(0x44ff88);
    agentGraphics.fillRect(4, 8, 24, 20);
    agentGraphics.fillStyle(0x000000);
    agentGraphics.fillRect(10, 12, 4, 4);
    agentGraphics.fillRect(18, 12, 4, 4);
    agentGraphics.fillRect(14, 2, 4, 8);
    agentGraphics.fillCircle(16, 2, 3);
    agentGraphics.generateTexture('player-agent', 32, 32);

    const objectGraphics = this.make.graphics({ x: 0, y: 0 });
    objectGraphics.fillStyle(0x8b4513);
    objectGraphics.fillRect(4, 4, 24, 24);
    objectGraphics.lineStyle(2, 0x654321);
    objectGraphics.strokeRect(4, 4, 24, 24);
    objectGraphics.generateTexture('player-object', 32, 32);

    this.scene.start('GameScene');
  }
}
