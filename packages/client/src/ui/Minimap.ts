import Phaser from 'phaser';
import { ZONE_BOUNDS, ZONE_COLORS, MAP_CONFIG, ZONE_IDS } from '@openclawworld/shared';

interface MinimapConfig {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  backgroundColor: number;
  borderColor: number;
  playerColor: number;
  otherPlayerColor: number;
  agentColor: number;
}

const DEFAULT_CONFIG: MinimapConfig = {
  width: 180,
  height: 180,
  mapWidth: MAP_CONFIG.pixelWidth,
  mapHeight: MAP_CONFIG.pixelHeight,
  backgroundColor: 0x1a1a2e,
  borderColor: 0x4a90d9,
  playerColor: 0xffff00,
  otherPlayerColor: 0x00ff00,
  agentColor: 0xff00ff,
};

const EXTRA_COLORS = {
  water: 0x3a7ca5,
  road: 0xa88b5a,
};

export class Minimap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private zoneGraphics: Phaser.GameObjects.Graphics;
  private entityGraphics: Phaser.GameObjects.Graphics;
  private viewportGraphics: Phaser.GameObjects.Graphics;
  private config: MinimapConfig;
  private padding = 10;

  constructor(scene: Phaser.Scene, config?: Partial<MinimapConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const x = this.padding;
    const y = this.padding;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1500);
    this.container.setScrollFactor(0);

    this.background = scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor, 0.85);
    this.background.fillRoundedRect(0, 0, this.config.width, this.config.height, 8);
    this.background.lineStyle(2, this.config.borderColor, 1);
    this.background.strokeRoundedRect(0, 0, this.config.width, this.config.height, 8);

    this.zoneGraphics = scene.add.graphics();
    this.entityGraphics = scene.add.graphics();
    this.viewportGraphics = scene.add.graphics();

    this.container.add([
      this.background,
      this.zoneGraphics,
      this.entityGraphics,
      this.viewportGraphics,
    ]);

    this.drawZones();
  }

  private drawZones(): void {
    this.zoneGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    this.zoneGraphics.fillStyle(EXTRA_COLORS.water, 0.8);
    for (let y = 0; y < 3; y++) {
      this.zoneGraphics.fillRect(
        offsetX,
        offsetY + y * 16 * scaleY,
        this.config.width - 8,
        16 * scaleY
      );
    }
    for (let y = 3; y < 20; y++) {
      this.zoneGraphics.fillRect(offsetX, offsetY + y * 16 * scaleY, 5 * 16 * scaleX, 16 * scaleY);
    }

    this.zoneGraphics.fillStyle(EXTRA_COLORS.road, 0.6);
    this.zoneGraphics.fillRect(
      offsetX + 17 * 16 * scaleX,
      offsetY + 12 * 16 * scaleY,
      23 * 16 * scaleX,
      4 * 16 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 17 * 16 * scaleX,
      offsetY + 16 * 16 * scaleY,
      4 * 16 * scaleX,
      22 * 16 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 37 * 16 * scaleX,
      offsetY + 18 * 16 * scaleY,
      3 * 16 * scaleX,
      15 * 16 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 17 * 16 * scaleX,
      offsetY + 36 * 16 * scaleY,
      41 * 16 * scaleX,
      14 * 16 * scaleY
    );

    for (const zoneId of ZONE_IDS) {
      const bounds = ZONE_BOUNDS[zoneId];
      const color = ZONE_COLORS[zoneId];
      this.zoneGraphics.fillStyle(color, 0.6);
      this.zoneGraphics.fillRect(
        offsetX + bounds.x * scaleX,
        offsetY + bounds.y * scaleY,
        bounds.width * scaleX,
        bounds.height * scaleY
      );

      this.zoneGraphics.lineStyle(1, 0xffffff, 0.3);
      this.zoneGraphics.strokeRect(
        offsetX + bounds.x * scaleX,
        offsetY + bounds.y * scaleY,
        bounds.width * scaleX,
        bounds.height * scaleY
      );
    }
  }

  updateEntities(
    entities: Map<string, { x: number; y: number; kind: string }>,
    myEntityId?: string
  ): void {
    this.entityGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    entities.forEach((entity, id) => {
      let color = this.config.otherPlayerColor;

      if (id === myEntityId) {
        color = this.config.playerColor;
      } else if (entity.kind === 'agent') {
        color = this.config.agentColor;
      }

      const x = offsetX + entity.x * scaleX;
      const y = offsetY + entity.y * scaleY;

      if (id === myEntityId) {
        this.entityGraphics.fillStyle(color, 1);
        this.entityGraphics.fillCircle(x, y, 4);
        this.entityGraphics.lineStyle(1, 0x000000, 1);
        this.entityGraphics.strokeCircle(x, y, 4);
      } else {
        this.entityGraphics.fillStyle(color, 0.8);
        this.entityGraphics.fillCircle(x, y, 3);
      }
    });
  }

  updateViewport(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.viewportGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    const worldViewWidth = camera.zoom > 0 ? camera.width / camera.zoom : 0;
    const worldViewHeight = camera.zoom > 0 ? camera.height / camera.zoom : 0;

    const viewX = offsetX + camera.scrollX * scaleX;
    const viewY = offsetY + camera.scrollY * scaleY;
    const viewW = worldViewWidth * scaleX;
    const viewH = worldViewHeight * scaleY;

    this.viewportGraphics.lineStyle(1, 0xffffff, 0.8);
    this.viewportGraphics.strokeRect(viewX, viewY, viewW, viewH);
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
